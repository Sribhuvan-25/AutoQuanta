#!/usr/bin/env python3
"""
Prediction API Bridge for AutoQuanta Frontend
Provides prediction functionality using trained models.
"""

import sys
import json
import pandas as pd
import numpy as np
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import tempfile
import os
import time
import pickle

# Add the project root to the path
project_root = str(Path(__file__).parent.parent)
sys.path.insert(0, project_root)

# Import from the Analysis package
from Analysis.core.exporter import ONNXInferenceEngine, load_onnx_model
from Analysis.core.loader import load_csv
from Analysis.core.preprocessor import AutoPreprocessor
from Analysis.utils.helpers import detect_task_type

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

def get_available_models() -> Dict[str, Any]:
    """Get list of available trained models."""
    try:
        models_dir = Path("models")
        if not models_dir.exists():
            return {
                'success': True,
                'models': [],
                'message': 'No models directory found'
            }
        
        models = []
        for model_dir in models_dir.iterdir():
            if model_dir.is_dir():
                metadata_path = model_dir / "metadata.json"
                if metadata_path.exists():
                    try:
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)
                        
                        # Check for model files
                        onnx_path = model_dir / "best_model.onnx"
                        pickle_path = model_dir / "best_model.pkl"
                        
                        model_info = {
                            'model_name': metadata.get('model_name', model_dir.name),
                            'model_type': metadata.get('best_model_type', 'unknown'),
                            'task_type': metadata.get('task_type', 'unknown'),
                            'target_column': metadata.get('target_column', 'unknown'),
                            'best_score': metadata.get('best_score', 0.0),
                            'export_timestamp': metadata.get('export_timestamp', 'unknown'),
                            'feature_count': metadata.get('feature_count', 0),
                            'training_data_shape': metadata.get('training_data_shape', [0, 0]),
                            'has_onnx': onnx_path.exists(),
                            'has_pickle': pickle_path.exists(),
                            'model_path': str(model_dir),
                            'onnx_path': str(onnx_path) if onnx_path.exists() else None,
                            'pickle_path': str(pickle_path) if pickle_path.exists() else None
                        }
                        models.append(model_info)
                        
                    except Exception as e:
                        logger.warning(f"Failed to read metadata for {model_dir.name}: {e}")
        
        # Sort by timestamp (most recent first)
        models.sort(key=lambda x: x.get('export_timestamp', ''), reverse=True)
        
        return {
            'success': True,
            'models': models,
            'message': f'Found {len(models)} trained models'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'models': [],
            'message': f'Failed to get available models: {e}'
        }

def predict_with_model(model_path: str, csv_data: str, use_onnx: bool = True) -> Dict[str, Any]:
    """
    Make predictions using a trained model.
    
    Args:
        model_path: Path to the model directory
        csv_data: CSV data as string
        use_onnx: Whether to use ONNX model (fallback to pickle)
        
    Returns:
        Dictionary with prediction results
    """
    try:
        # Stage 1: Load model metadata
        emit_progress("loading", 10, "Loading model metadata...")
        
        model_dir = Path(model_path)
        metadata_path = model_dir / "metadata.json"
        
        if not metadata_path.exists():
            raise ValueError(f"Model metadata not found: {metadata_path}")
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Stage 2: Load input data
        emit_progress("loading", 20, "Loading input data...")
        
        # Parse CSV data
        from io import StringIO
        df = pd.read_csv(StringIO(csv_data))
        
        logger.info(f"Input data shape: {df.shape}")
        logger.info(f"Input columns: {list(df.columns)}")
        
        # Stage 3: Preprocess data
        emit_progress("preprocessing", 30, "Preprocessing data...")
        
        # For prediction, we need to apply the same preprocessing that was used during training
        # In a production system, you'd save the preprocessor along with the model
        # For now, we'll use a basic preprocessing approach
        
        # Get numeric columns only (simple preprocessing)
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if len(numeric_cols) == 0:
            raise ValueError("No numeric columns found in input data")
        
        X = df[numeric_cols].fillna(0).values.astype(np.float32)
        
        logger.info(f"Preprocessed data shape: {X.shape}")
        logger.info(f"Expected feature count: {metadata.get('feature_count', 'unknown')}")
        
        # Stage 4: Load model and make predictions
        emit_progress("predicting", 50, "Loading model and making predictions...")
        
        predictions = None
        prediction_method = "unknown"
        
        # Try ONNX first if requested and available
        if use_onnx:
            onnx_path = model_dir / "best_model.onnx"
            if onnx_path.exists():
                try:
                    logger.info("Using ONNX model for prediction")
                    inference_engine = ONNXInferenceEngine(onnx_path)
                    predictions = inference_engine.predict(X)
                    prediction_method = "onnx"
                except Exception as onnx_error:
                    logger.warning(f"ONNX prediction failed: {onnx_error}")
                    use_onnx = False
        
        # Fallback to pickle model
        if predictions is None:
            pickle_path = model_dir / "best_model.pkl"
            if pickle_path.exists():
                try:
                    logger.info("Using pickle model for prediction")
                    with open(pickle_path, 'rb') as f:
                        model = pickle.load(f)
                    predictions = model.predict(X)
                    prediction_method = "pickle"
                except Exception as pickle_error:
                    logger.error(f"Pickle prediction failed: {pickle_error}")
                    raise ValueError(f"Both ONNX and pickle prediction failed")
            else:
                raise ValueError("No model files found (neither ONNX nor pickle)")
        
        # Stage 5: Process results
        emit_progress("processing", 80, "Processing prediction results...")
        
        # Convert predictions to list for JSON serialization
        if isinstance(predictions, np.ndarray):
            predictions_list = predictions.tolist()
        else:
            predictions_list = list(predictions)
        
        # Calculate prediction statistics
        pred_stats = {
            'count': len(predictions_list),
            'mean': float(np.mean(predictions)),
            'std': float(np.std(predictions)),
            'min': float(np.min(predictions)),
            'max': float(np.max(predictions))
        }
        
        # Create output dataframe with predictions
        output_df = df.copy()
        output_df['prediction'] = predictions_list
        
        # For classification, add prediction labels if possible
        task_type = metadata.get('task_type', 'regression')
        if task_type == 'classification':
            # Add prediction probabilities if available (for future enhancement)
            pred_stats['unique_predictions'] = len(np.unique(predictions))
        
        # Convert output dataframe to CSV string
        output_csv = output_df.to_csv(index=False)
        
        # Stage 6: Complete
        emit_progress("completed", 100, f"Prediction completed! {len(predictions_list)} predictions made")
        
        return {
            'success': True,
            'predictions': predictions_list,
            'prediction_stats': pred_stats,
            'output_csv': output_csv,
            'input_shape': list(df.shape),
            'prediction_method': prediction_method,
            'model_metadata': {
                'model_name': metadata.get('model_name', 'unknown'),
                'model_type': metadata.get('best_model_type', 'unknown'),
                'task_type': metadata.get('task_type', 'unknown'),
                'target_column': metadata.get('target_column', 'unknown'),
                'training_score': metadata.get('best_score', 0.0)
            },
            'message': f'Successfully made {len(predictions_list)} predictions using {prediction_method} model'
        }
        
    except Exception as e:
        emit_progress("error", 0, f"Prediction failed: {str(e)}")
        logger.error(f"Prediction failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': f'Prediction failed: {e}'
        }

def predict_single_values(model_path: str, values: List[float]) -> Dict[str, Any]:
    """
    Make prediction on single row of values.
    
    Args:
        model_path: Path to the model directory
        values: List of feature values
        
    Returns:
        Dictionary with prediction result
    """
    try:
        # Load model metadata
        model_dir = Path(model_path)
        metadata_path = model_dir / "metadata.json"
        
        if not metadata_path.exists():
            raise ValueError(f"Model metadata not found: {metadata_path}")
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Convert values to numpy array
        X = np.array([values], dtype=np.float32)
        
        logger.info(f"Single prediction input shape: {X.shape}")
        logger.info(f"Expected feature count: {metadata.get('feature_count', 'unknown')}")
        
        # Try ONNX first
        predictions = None
        prediction_method = "unknown"
        
        onnx_path = model_dir / "best_model.onnx"
        if onnx_path.exists():
            try:
                inference_engine = ONNXInferenceEngine(onnx_path)
                predictions = inference_engine.predict(X)
                prediction_method = "onnx"
            except Exception as onnx_error:
                logger.warning(f"ONNX prediction failed: {onnx_error}")
        
        # Fallback to pickle
        if predictions is None:
            pickle_path = model_dir / "best_model.pkl"
            if pickle_path.exists():
                with open(pickle_path, 'rb') as f:
                    model = pickle.load(f)
                predictions = model.predict(X)
                prediction_method = "pickle"
            else:
                raise ValueError("No model files found")
        
        # Get single prediction value
        prediction_value = float(predictions[0])
        
        return {
            'success': True,
            'prediction': prediction_value,
            'prediction_method': prediction_method,
            'model_metadata': {
                'model_name': metadata.get('model_name', 'unknown'),
                'model_type': metadata.get('best_model_type', 'unknown'),
                'task_type': metadata.get('task_type', 'unknown'),
                'training_score': metadata.get('best_score', 0.0)
            },
            'message': f'Single prediction: {prediction_value}'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': f'Single prediction failed: {e}'
        }

def main():
    """Main entry point for prediction API calls."""
    if len(sys.argv) < 2:
        print("Usage: python predict_api.py <command> [args...]")
        print("Commands:")
        print("  list_models")
        print("  predict <model_path> <csv_data> [use_onnx]")
        print("  predict_single <model_path> <values_json>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "list_models":
            result = get_available_models()
            
        elif command == "predict":
            if len(sys.argv) < 4:
                raise ValueError("predict command requires model_path and csv_data")
            
            model_path = sys.argv[2]
            csv_data = sys.argv[3]
            use_onnx = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else True
            
            result = predict_with_model(model_path, csv_data, use_onnx)
            
        elif command == "predict_single":
            if len(sys.argv) < 4:
                raise ValueError("predict_single command requires model_path and values_json")
            
            model_path = sys.argv[2]
            values_json = sys.argv[3]
            values = json.loads(values_json)
            
            result = predict_single_values(model_path, values)
            
        else:
            raise ValueError(f"Unknown command: {command}")
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
        # Exit with appropriate code
        sys.exit(0 if result['success'] else 1)
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'message': f'Prediction API call failed: {e}'
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()