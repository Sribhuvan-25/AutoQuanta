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

def emit_metric(metric_name: str, value: Any, extra_data: Dict = None):
    """Emit a metric event as JSON to stdout."""
    metric_event = {
        "metric": metric_name,
        "value": value,
        "timestamp": time.time(),
        **(extra_data or {})
    }
    print(f"METRIC:{json.dumps(metric_event)}")
    sys.stdout.flush()

def emit_log(level: str, message: str):
    """Emit a log event as JSON to stdout."""
    log_event = {
        "level": level,
        "message": message,
        "timestamp": time.time()
    }
    print(f"LOG:{json.dumps(log_event)}")
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
                'comprehensive_metrics': model.comprehensive_metrics or {},
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
                'comprehensive_metrics': best_model.comprehensive_metrics or {},
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
            'preprocessing_report': getattr(results, 'preprocessing_report', None),
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

def save_trained_model_simple(results, df, target_column: str, project_path: str = None) -> Dict[str, Any]:
    """Save trained model with pickle and metadata (simplified version)."""
    try:
        # Create unique model directory
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        model_name = results.best_model.model_name

        # Use project path if provided, otherwise default to models/
        if project_path:
            base_dir = Path(project_path) / "models"
        else:
            base_dir = Path("models")

        model_dir = base_dir / f"{model_name}_{timestamp}"
        model_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Saving model to: {model_dir}")
        
        # Save model with pickle
        pickle_path = model_dir / "best_model.pkl"
        with open(pickle_path, 'wb') as f:
            pickle.dump({
                'model': results.best_model.model_object,
                'feature_names': [col for col in df.columns if col != target_column],
                'target_column': target_column,
                'model_name': results.best_model.model_name
            }, f)
        
        # Create metadata
        try:
            feature_names = [col for col in df.columns if col != target_column]
        except Exception:
            feature_names = []
            
        metadata = {
            'model_name': model_name,
            'model_type': model_name,
            'task_type': 'classification' if hasattr(results.best_model.model_object, 'classes_') else 'regression',
            'target_column': target_column,
            'best_score': float(results.best_model.mean_score),
            'export_timestamp': timestamp,
            'feature_count': len(feature_names),
            'feature_names': feature_names,
            'training_data_shape': [len(df), len(df.columns)],
            'has_onnx': False,
            'has_pickle': True,
            'model_path': str(model_dir),
            'pickle_path': str(pickle_path),
            'cv_scores': [float(score) for score in results.best_model.cv_scores],
            'std_score': float(results.best_model.std_score),
            'training_time': float(results.best_model.training_time)
        }
        
        # Save metadata
        metadata_path = model_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return {
            'success': True,
            'model_path': str(model_dir),
            'pickle_path': str(pickle_path),
            'metadata_path': str(metadata_path),
            'metadata': metadata
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

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
        
        # Get feature names from preprocessor
        feature_names = []
        try:
            if hasattr(preprocessor, 'get_feature_names_out'):
                feature_names = preprocessor.get_feature_names_out().tolist()
            elif hasattr(preprocessor, 'feature_names_'):
                feature_names = preprocessor.feature_names_.tolist()
            else:
                # Fallback: get numeric column names from original data
                numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
                if target_column in numeric_cols:
                    numeric_cols.remove(target_column)
                feature_names = numeric_cols[:X_sample.shape[1]]
        except Exception as e:
            logger.warning(f"Could not extract feature names: {e}")
            # Generate generic feature names
            feature_names = [f"feature_{i}" for i in range(X_sample.shape[1])]
        
        # Create model metadata
        metadata = {
            'model_name': model_name,
            'export_timestamp': timestamp,
            'best_model_type': results.best_model.model_name,
            'best_score': float(results.best_model.mean_score),
            'task_type': results.training_config.task_type,
            'target_column': target_column,
            'feature_count': X_sample.shape[1],
            'feature_names': feature_names,
            'training_data_shape': df.shape,
            'cv_folds': results.training_config.cv_folds,
            'models_trained': [model.model_name for model in results.all_models],
            'preprocessing_info': {
                'numeric_columns': df.select_dtypes(include=[np.number]).columns.tolist(),
                'categorical_columns': df.select_dtypes(include=['object']).columns.tolist(),
                'total_columns': len(df.columns),
                'missing_value_strategy': 'zero_fill'  # Document our strategy
            }
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
        
        # Validate and potentially correct task type
        original_task_type = config.get('task_type', 'classification')
        target_series = df[target_column]

        # Try to convert target to numeric if it's not already
        is_numeric = pd.api.types.is_numeric_dtype(target_series)
        if not is_numeric:
            # Try conversion
            target_numeric = pd.to_numeric(target_series, errors='coerce')
            conversion_rate = target_numeric.notna().sum() / len(target_series)

            # If >90% convert successfully, it's likely numeric
            if conversion_rate > 0.9:
                logger.info(f"Target column '{target_column}' detected as text but {conversion_rate:.1%} values are numeric. Converting to numeric.")
                df[target_column] = target_numeric

                # Drop rows with NaN in target column after conversion
                rows_before = len(df)
                df = df[df[target_column].notna()].copy()
                rows_after = len(df)

                if rows_before > rows_after:
                    logger.warning(f"Dropped {rows_before - rows_after} rows with non-numeric values in target column")

                target_series = df[target_column]
                is_numeric = True

        # Check if the target looks like continuous data (many unique values relative to dataset size)
        unique_ratio = target_series.nunique() / len(target_series)
        unique_count = target_series.nunique()

        if original_task_type == 'classification' and is_numeric and unique_ratio > 0.1:
            logger.warning(f"Target column '{target_column}' has {unique_count} unique values ({unique_ratio:.1%} of data)")
            logger.warning(f"This looks like continuous data. Switching from classification to regression.")
            config['task_type'] = 'regression'
        elif original_task_type == 'regression' and not is_numeric:
            logger.warning(f"Target column '{target_column}' is not numeric. Switching from regression to classification.")
            config['task_type'] = 'classification'
        elif original_task_type == 'classification' and unique_count > 100:
            # Too many classes for classification
            raise ValueError(
                f"Target column '{target_column}' has {unique_count} unique values, which is too many for classification. "
                f"This data appears to be continuous. Please either:\n"
                f"1. Change task type to 'regression' if this is a continuous variable\n"
                f"2. Bin the values into fewer categories if you need classification\n"
                f"3. Select a different target column"
            )
        
        # Final check: Remove any remaining NaN values in target column
        nan_count = df[target_column].isna().sum()
        if nan_count > 0:
            logger.warning(f"Found {nan_count} NaN values in target column. Removing these rows.")
            rows_before = len(df)
            df = df[df[target_column].notna()].copy()
            rows_after = len(df)
            logger.info(f"Dataset reduced from {rows_before} to {rows_after} rows after removing NaN values")

        # Verify we still have enough data
        if len(df) < 10:
            raise ValueError(f"Not enough valid data rows ({len(df)}) after cleaning. Need at least 10 rows for training.")

        # Map frontend model names to Python model names
        python_models = map_frontend_to_python_models(config.get('models_to_try', ['random_forest']))

        logger.info(f"Target column: {target_column}")
        logger.info(f"Task type: {config.get('task_type', 'classification')}")
        logger.info(f"Models to try: {python_models}")
        logger.info(f"Final dataset shape: {df.shape}")

        # Stage 2: Data Preparation
        emit_progress("preparing", 20, "Preparing data and preprocessing...")
        
        # Stage 3: Model Training (this will emit more detailed progress)
        emit_progress("training", 25, f"Starting training with {len(python_models)} models...")
        
        # Extract preprocessing configuration if provided
        preprocessing_config = config.get('preprocessing', None)

        # Call the training engine
        emit_log('info', f"Training {len(python_models)} model(s) with {config.get('cv_folds', 5)}-fold cross-validation")

        results = train_models(
            df=df,
            target_column=target_column,
            task_type=config.get('task_type', 'classification'),
            models_to_try=python_models,
            cv_folds=config.get('cv_folds', 5),
            test_size=config.get('test_size', 0.2),
            random_seed=config.get('random_seed', 42),
            preprocessing_config=preprocessing_config
        )

        # Stage 4: Results Processing
        emit_progress("evaluating", 90, "Processing training results...")

        # Emit metrics for best model
        emit_metric('best_score', results.best_model.mean_score, {
            'model_name': results.best_model.model_name,
            'std_score': results.best_model.std_score
        })

        emit_log('success', f"Training completed successfully!")
        emit_log('info', f"Best model: {results.best_model.model_name}")
        emit_log('info', f"Best score: {results.best_model.mean_score:.4f}")
        
        # Serialize results for frontend
        serialized_results = serialize_training_results(results)
        
        # Stage 5: Model Export - Always save pickle model and metadata
        export_result = None
        try:
            emit_progress("exporting", 95, "Saving trained model...")

            # Extract project path from config if available
            project_config = config.get('projectConfig')
            project_path = None
            if project_config and isinstance(project_config, dict):
                # Try to get project path from the structure
                structure = project_config.get('structure', {})
                project_path = structure.get('projectPath')

            export_result = save_trained_model_simple(results, df, target_column, project_path)
            if export_result['success']:
                logger.info(f"Model saved successfully to: {export_result['model_path']}")
                # Add export info to serialized results
                serialized_results['export_info'] = export_result
            else:
                logger.warning(f"Model save failed: {export_result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.warning(f"Model save failed: {e}")
            export_result = {'success': False, 'error': str(e)}
        
        # Stage 6: Complete
        emit_progress("completed", 100, f"Training completed! Best model: {results.best_model.model_name}")

        # Add project save information to results if saved to project
        if export_result and export_result.get('success') and project_path:
            serialized_results['projectSaved'] = True
            serialized_results['projectSavePath'] = export_result.get('model_path')

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