#!/usr/bin/env python3
"""
Training API Bridge for AutoQuanta Frontend
Provides a simple API to call the training engine from the frontend.
"""

import sys
import json
import pandas as pd
import logging
from pathlib import Path
from typing import Dict, Any
import tempfile
import os
import time
import pickle

# Add the project root to the path
project_root = str(Path(__file__).parent.parent)
sys.path.insert(0, project_root)

# Import from the Analysis package
from Analysis.core.trainer import train_models
from Analysis.core.preprocessor import AutoPreprocessor
from Analysis.utils.data_structures import TrainingConfig

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def emit_progress(stage: str, progress: float, message: str, extra_data: Dict = None):
    """Emit a progress event as JSON to stdout."""
    progress_event = {
        "type": "progress",
        "stage": stage,
        "progress": progress,
        "message": message,
        "timestamp": time.time(),
        **(extra_data or {})
    }
    # Emit to stdout for frontend to capture
    print(f"PROGRESS:{json.dumps(progress_event)}")
    sys.stdout.flush()

def serialize_training_results(results) -> Dict[str, Any]:
    """Convert TrainingResults to JSON-serializable format."""
    try:
        # Convert numpy arrays to lists and handle non-serializable objects
        def convert_numpy(obj):
            if hasattr(obj, 'tolist'):
                return obj.tolist()
            elif hasattr(obj, 'item'):
                return obj.item()
            return obj
        
        best_model = results.best_model
        all_models = []
        
        # Process all models
        for model in results.all_models:
            model_data = {
                'model_name': model.model_name,
                'cv_scores': convert_numpy(model.cv_scores),
                'mean_score': float(model.mean_score),
                'std_score': float(model.std_score),
                'training_time': float(model.training_time),
                'best_params': model.best_params,
                'feature_importance': model.feature_importance or {},
                'fold_results': []
            }
            
            # Process fold results
            for fold in model.fold_results:
                fold_data = {
                    'fold_idx': fold.fold_idx,
                    'train_score': float(fold.train_score),
                    'val_score': float(fold.val_score),
                    'train_time': float(model.training_time / len(model.fold_results)),
                    'model_params': model.best_params,
                    'train_indices': convert_numpy(fold.train_indices),
                    'val_indices': convert_numpy(fold.val_indices),
                    'val_predictions': convert_numpy(fold.val_predictions),
                    'val_actual': convert_numpy(fold.val_actual)
                }
                model_data['fold_results'].append(fold_data)
            
            # Add aggregated predictions
            model_data['all_predictions'] = convert_numpy(model.all_predictions)
            model_data['all_actuals'] = convert_numpy(model.all_actuals)
            
            all_models.append(model_data)
        
        # Create the response matching frontend TrainingResults interface
        response = {
            'best_model': {
                'model_name': best_model.model_name,
                'cv_scores': convert_numpy(best_model.cv_scores),
                'mean_score': float(best_model.mean_score),
                'std_score': float(best_model.std_score),
                'fold_results': all_models[0]['fold_results'] if all_models else [],
                'feature_importance': best_model.feature_importance or {},
                'training_time': float(best_model.training_time),
                'all_predictions': convert_numpy(best_model.all_predictions),
                'all_actuals': convert_numpy(best_model.all_actuals)
            },
            'all_models': all_models,
            'training_config': {
                'target_column': results.training_config.target_column,
                'task_type': results.training_config.task_type,
                'test_size': results.training_config.test_size,
                'cv_folds': results.training_config.cv_folds,
                'random_seed': results.training_config.random_seed,
                'models_to_try': results.training_config.models_to_try
            },
            'data_profile': None,  # Can be added if needed
            'cv_summary': results.cv_summary,
            'model_comparison': results.model_comparison,
            'prediction_analysis': results.prediction_analysis
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error serializing training results: {e}")
        raise

def map_frontend_to_python_models(frontend_models):
    """Map frontend model names to Python model names."""
    mapping = {
        'random_forest': 'rf',
        'gradient_boosting': 'lgbm',
        'xgboost': 'xgb',
        'logistic_regression': 'rf',  # Fallback to RF for now
        'linear_regression': 'rf',    # Fallback to RF for now
        'svm': 'rf',                 # Fallback to RF for now
        'neural_network': 'rf'       # Fallback to RF for now
    }
    
    python_models = []
    for model in frontend_models:
        python_model = mapping.get(model, 'rf')
        if python_model not in python_models:
            python_models.append(python_model)
    
    return python_models

def export_trained_model(results, df, target_column: str) -> Dict[str, Any]:
    """Export the trained model to ONNX format with metadata."""
    try:
        # Import ONNX exporter
        from Analysis.core.exporter import ONNXExporter
        
        # Create output directory
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)
        
        # Create timestamped model directory
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        model_name = f"{results.best_model.model_name}_{timestamp}"
        model_dir = models_dir / model_name
        model_dir.mkdir(exist_ok=True)
        
        # Prepare sample data for ONNX export
        preprocessor = AutoPreprocessor(target_column=target_column, task_type=results.training_config.task_type)
        X_sample, _ = preprocessor.fit_transform(df.head(5))
        
        # Try to export the model to ONNX
        export_info = {'success': False, 'model_size_mb': 0}
        try:
            exporter = ONNXExporter()
            model_path = model_dir / "best_model.onnx"
            export_info = exporter.export_model(
                model=results.best_model.model_object,
                X_sample=X_sample,
                output_path=model_path,
                model_name=f"{results.best_model.model_name}_model"
            )
        except Exception as onnx_error:
            logger.warning(f"ONNX export failed: {onnx_error}")
            export_info = {
                'success': False, 
                'error': f'ONNX export failed: {str(onnx_error)}',
                'model_size_mb': 0
            }
        
        # Always save the model using pickle as fallback
        pickle_path = model_dir / "best_model.pkl"
        with open(pickle_path, 'wb') as f:
            pickle.dump(results.best_model.model_object, f)
        
        # Create model metadata
        metadata = {
            'model_name': model_name,
            'export_timestamp': timestamp,
            'best_model_type': results.best_model.model_name,
            'best_score': float(results.best_model.mean_score),
            'task_type': results.training_config.task_type,
            'target_column': target_column,
            'feature_count': X_sample.shape[1],
            'training_data_shape': df.shape,
            'cv_folds': results.training_config.cv_folds,
            'models_trained': [model.model_name for model in results.all_models]
        }
        
        # Save metadata
        metadata_path = model_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return {
            'success': True,
            'model_name': model_name,
            'model_dir': str(model_dir),
            'onnx_model_path': str(model_dir / "best_model.onnx") if export_info['success'] else None,
            'pickle_model_path': str(pickle_path),
            'metadata_path': str(metadata_path),
            'onnx_export_success': export_info['success'],
            'onnx_export_error': export_info.get('error'),
            'model_size_mb': export_info.get('model_size_mb', 0),
            'metadata': metadata
        }
        
    except ImportError:
        return {
            'success': False,
            'error': 'ONNX libraries not available. Install with: pip install onnx skl2onnx onnxruntime'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def train_from_api(csv_path: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Train models using the AutoQuanta training engine.
    
    Args:
        csv_path: Path to the CSV file
        config: Training configuration from frontend
        
    Returns:
        Dictionary with training results
    """
    try:
        # Stage 1: Data Loading
        emit_progress("loading", 0, "Loading CSV data...")
        logger.info(f"Loading data from: {csv_path}")
        
        # Load the CSV data
        df = pd.read_csv(csv_path)
        logger.info(f"Data loaded: {df.shape[0]} rows, {df.shape[1]} columns")
        logger.info(f"Columns: {list(df.columns)}")
        
        emit_progress("loading", 15, f"Loaded {df.shape[0]} rows with {df.shape[1]} columns")
        
        # Validate target column
        target_column = config['target_column']
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in data. Available columns: {list(df.columns)}")
        
        # Map frontend model names to Python model names
        python_models = map_frontend_to_python_models(config.get('models_to_try', ['random_forest']))
        
        logger.info(f"Target column: {target_column}")
        logger.info(f"Task type: {config.get('task_type', 'classification')}")
        logger.info(f"Models to try: {python_models}")
        
        # Stage 2: Data Preparation
        emit_progress("preparing", 20, "Preparing data and preprocessing...")
        
        # Stage 3: Model Training (this will emit more detailed progress)
        emit_progress("training", 25, f"Starting training with {len(python_models)} models...")
        
        # Call the training engine
        results = train_models(
            df=df,
            target_column=target_column,
            task_type=config.get('task_type', 'classification'),
            models_to_try=python_models,
            cv_folds=config.get('cv_folds', 5),
            test_size=config.get('test_size', 0.2),
            random_seed=config.get('random_seed', 42)
        )
        
        # Stage 4: Results Processing
        emit_progress("evaluating", 90, "Processing training results...")
        
        logger.info(f"Training completed successfully!")
        logger.info(f"Best model: {results.best_model.model_name}")
        logger.info(f"Best score: {results.best_model.mean_score:.4f}")
        
        # Serialize results for frontend
        serialized_results = serialize_training_results(results)
        
        # Stage 5: Model Export
        export_result = None
        try:
            emit_progress("exporting", 95, "Exporting model to ONNX format...")
            export_result = export_trained_model(results, df, target_column)
            if export_result['success']:
                logger.info(f"Model exported successfully to: {export_result['model_path']}")
                # Add export info to serialized results
                serialized_results['export_info'] = export_result
            else:
                logger.warning(f"Model export failed: {export_result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.warning(f"Model export failed: {e}")
            export_result = {'success': False, 'error': str(e)}
        
        # Stage 6: Complete
        emit_progress("completed", 100, f"Training completed! Best model: {results.best_model.model_name}")
        
        return {
            'success': True,
            'results': serialized_results,
            'export_result': export_result or {'success': False, 'error': 'Export not attempted'},
            'message': f'Training completed. Best model: {results.best_model.model_name} (Score: {results.best_model.mean_score:.4f})'
        }
        
    except Exception as e:
        emit_progress("error", 0, f"Training failed: {str(e)}")
        logger.error(f"Training failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': f'Training failed: {e}'
        }

def main():
    """Main entry point for API calls."""
    if len(sys.argv) != 3:
        print("Usage: python train_api.py <csv_path> <config_json>")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    config_json = sys.argv[2]
    
    try:
        # Parse config
        config = json.loads(config_json)
        
        # Run training
        result = train_from_api(csv_path, config)
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
        # Exit with appropriate code
        sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'message': f'API call failed: {e}'
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()