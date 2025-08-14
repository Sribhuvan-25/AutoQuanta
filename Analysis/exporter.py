"""
ONNX export functionality for AutoQuanta.
Converts trained models to ONNX format for portable inference.
"""

import numpy as np
import pandas as pd
from typing import Any, Optional, Dict, List, Union, Tuple
from pathlib import Path
import logging
import tempfile
import pickle
import json

try:
    import onnx
    from skl2onnx import to_onnx
    from skl2onnx.common.data_types import FloatTensorType
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("ONNX libraries not available. Install with: pip install onnx skl2onnx onnxruntime")

try:
    from .utils import Timer
    from .trainer import TrainingResults
except ImportError:
    from utils import Timer
    from trainer import TrainingResults

logger = logging.getLogger(__name__)


class ONNXExporter:
    """Export trained models to ONNX format."""
    
    def __init__(self):
        if not ONNX_AVAILABLE:
            raise ImportError(
                "ONNX libraries not available. "
                "Install with: pip install onnx skl2onnx onnxruntime"
            )
    
    def export_model(self, 
                    model: Any,
                    X_sample: np.ndarray,
                    output_path: Union[str, Path],
                    model_name: str = "AutoQuantaModel") -> Dict[str, Any]:
        """
        Export a trained model to ONNX format.
        
        Args:
            model: Trained scikit-learn compatible model
            X_sample: Sample input data for ONNX conversion
            output_path: Path to save the ONNX model
            model_name: Name for the ONNX model
            
        Returns:
            Dictionary with export information
        """
        output_path = Path(output_path)
        
        with Timer(f"ONNX export to {output_path.name}"):
            try:
                # Ensure X_sample is float32 for ONNX
                X_sample_float32 = X_sample.astype(np.float32)
                
                # Convert to ONNX
                onnx_model = to_onnx(
                    model, 
                    X_sample_float32,
                    options={'zipmap': False},  # Simpler output format
                    target_opset=12  # Use stable opset
                )
                
                # Save the model
                onnx.save_model(onnx_model, str(output_path))
                
                # Validate the exported model
                validation_results = self._validate_onnx_model(output_path, X_sample_float32)
                
                # Get model info
                model_info = self._get_model_info(onnx_model)
                
                logger.info(f"ONNX model exported successfully to {output_path}")
                
                return {
                    'success': True,
                    'output_path': str(output_path),
                    'model_size_mb': output_path.stat().st_size / (1024 * 1024),
                    'validation': validation_results,
                    'model_info': model_info
                }
                
            except Exception as e:
                logger.error(f"ONNX export failed: {str(e)}")
                return {
                    'success': False,
                    'error': str(e),
                    'output_path': str(output_path)
                }
    
    def export_training_results(self,
                              results: TrainingResults,
                              output_dir: Union[str, Path],
                              X_sample: np.ndarray) -> Dict[str, Any]:
        """
        Export training results including the best model and metadata.
        
        Args:
            results: TrainingResults from training
            output_dir: Directory to save exports
            X_sample: Sample input data
            
        Returns:
            Export information
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Export the best model
        model_path = output_dir / "best_model.onnx"
        export_result = self.export_model(
            results.best_model.model_object,
            X_sample,
            model_path,
            f"AutoQuanta_{results.best_model.model_name}"
        )
        
        # Save model metadata
        metadata = {
            'model_name': results.best_model.model_name,
            'model_type': results.training_config.task_type,
            'cv_score': results.best_model.mean_score,
            'cv_std': results.best_model.std_score,
            'feature_names': results.feature_names,
            'feature_count': len(results.feature_names),
            'training_config': {
                'target_column': results.training_config.target_column,
                'task_type': results.training_config.task_type,
                'cv_folds': results.training_config.cv_folds,
                'random_seed': results.training_config.random_seed
            },
            'preprocessing_report': results.preprocessing_report,
            'training_summary': results.training_summary
        }
        
        metadata_path = output_dir / "model_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)
        
        # Save feature importance if available
        if results.best_model.feature_importance:
            importance_df = pd.DataFrame([
                {'feature': k, 'importance': v}
                for k, v in results.best_model.feature_importance.items()
            ]).sort_values('importance', ascending=False)
            
            importance_path = output_dir / "feature_importance.csv"
            importance_df.to_csv(importance_path, index=False)
        
        # Save training results summary
        summary_path = output_dir / "training_summary.json"
        summary_data = {
            'best_model': results.best_model.model_name,
            'best_score': results.best_model.mean_score,
            'all_model_scores': {
                result.model_name: {
                    'mean_score': result.mean_score,
                    'std_score': result.std_score,
                    'training_time': result.training_time
                }
                for result in results.all_results
            },
            'total_training_time': sum(r.training_time for r in results.all_results)
        }
        
        with open(summary_path, 'w') as f:
            json.dump(summary_data, f, indent=2)
        
        export_result['metadata_path'] = str(metadata_path)
        export_result['feature_importance_path'] = str(importance_path) if results.best_model.feature_importance else None
        export_result['summary_path'] = str(summary_path)
        
        return export_result
    
    def _validate_onnx_model(self, model_path: Path, X_sample: np.ndarray) -> Dict[str, Any]:
        """Validate that the exported ONNX model works correctly."""
        
        try:
            # Load ONNX model
            session = ort.InferenceSession(str(model_path))
            
            # Get input and output info
            input_info = session.get_inputs()[0]
            output_info = session.get_outputs()[0]
            
            # Run inference test
            input_name = input_info.name
            result = session.run(None, {input_name: X_sample})
            
            return {
                'success': True,
                'input_name': input_name,
                'input_shape': input_info.shape,
                'output_name': output_info.name,
                'output_shape': list(result[0].shape),
                'sample_predictions': result[0][:5].tolist() if len(result[0]) > 0 else []
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_model_info(self, onnx_model) -> Dict[str, Any]:
        """Get information about the ONNX model."""
        
        return {
            'ir_version': onnx_model.ir_version,
            'producer_name': onnx_model.producer_name,
            'producer_version': onnx_model.producer_version,
            'domain': onnx_model.domain,
            'model_version': onnx_model.model_version,
            'doc_string': onnx_model.doc_string,
            'graph_name': onnx_model.graph.name,
            'input_count': len(onnx_model.graph.input),
            'output_count': len(onnx_model.graph.output),
            'node_count': len(onnx_model.graph.node)
        }


class ONNXInferenceEngine:
    """Run inference with ONNX models."""
    
    def __init__(self, model_path: Union[str, Path]):
        """
        Initialize the inference engine.
        
        Args:
            model_path: Path to the ONNX model file
        """
        if not ONNX_AVAILABLE:
            raise ImportError("ONNX libraries not available")
        
        self.model_path = Path(model_path)
        
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model file not found: {self.model_path}")
        
        # Load the ONNX session
        self.session = ort.InferenceSession(str(self.model_path))
        
        # Get input and output names
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [output.name for output in self.session.get_outputs()]
        
        # Get input shape info
        self.input_shape = self.session.get_inputs()[0].shape
        
        logger.info(f"Loaded ONNX model from {self.model_path}")
        logger.info(f"Input: {self.input_name} {self.input_shape}")
        logger.info(f"Outputs: {self.output_names}")
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Run inference on input data.
        
        Args:
            X: Input feature matrix
            
        Returns:
            Predictions array
        """
        # Ensure input is float32
        X_float32 = X.astype(np.float32)
        
        # Run inference
        results = self.session.run(None, {self.input_name: X_float32})
        
        # Return the first output (predictions)
        return results[0]
    
    def predict_batch(self, X: np.ndarray, batch_size: int = 1000) -> np.ndarray:
        """
        Run inference on large datasets in batches.
        
        Args:
            X: Input feature matrix
            batch_size: Number of samples per batch
            
        Returns:
            Predictions array
        """
        if len(X) <= batch_size:
            return self.predict(X)
        
        predictions = []
        
        with Timer(f"Batch inference on {len(X)} samples"):
            for i in range(0, len(X), batch_size):
                batch = X[i:i + batch_size]
                batch_pred = self.predict(batch)
                predictions.append(batch_pred)
        
        return np.vstack(predictions)
    
    def predict_from_csv(self,
                        csv_path: Union[str, Path],
                        output_path: Union[str, Path],
                        batch_size: int = 1000) -> Dict[str, Any]:
        """
        Run inference on a CSV file and save predictions.
        
        Args:
            csv_path: Path to input CSV file
            output_path: Path to save predictions CSV
            batch_size: Batch size for processing
            
        Returns:
            Summary of the inference process
        """
        try:
            from .loader import load_csv
        except ImportError:
            from loader import load_csv
        
        csv_path = Path(csv_path)
        output_path = Path(output_path)
        
        with Timer(f"CSV inference: {csv_path.name}"):
            # Load data
            df = load_csv(csv_path)
            
            # Assume all columns except target are features
            # In practice, you'd want to apply the same preprocessing
            # that was used during training
            X = df.select_dtypes(include=[np.number]).values
            
            # Run predictions
            predictions = self.predict_batch(X, batch_size)
            
            # Create output DataFrame
            output_df = df.copy()
            if predictions.ndim == 1:
                output_df['prediction'] = predictions
            else:
                # Multi-output case
                for i in range(predictions.shape[1]):
                    output_df[f'prediction_{i}'] = predictions[:, i]
            
            # Save results
            output_df.to_csv(output_path, index=False)
            
            # Calculate summary
            pred_summary = {
                'mean': float(np.mean(predictions)),
                'std': float(np.std(predictions)),
                'min': float(np.min(predictions)),
                'max': float(np.max(predictions))
            }
            
            return {
                'input_file': str(csv_path),
                'output_file': str(output_path),
                'input_rows': len(df),
                'output_rows': len(output_df),
                'prediction_summary': pred_summary,
                'processing_time': 0  # Will be filled by Timer
            }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        
        return {
            'model_path': str(self.model_path),
            'input_name': self.input_name,
            'input_shape': self.input_shape,
            'output_names': self.output_names,
            'providers': self.session.get_providers()
        }


# Convenience functions
def export_model(model: Any,
                X_sample: np.ndarray,
                output_path: Union[str, Path],
                model_name: str = "AutoQuantaModel") -> Dict[str, Any]:
    """
    Quick function to export a model to ONNX.
    
    Args:
        model: Trained model
        X_sample: Sample input data
        output_path: Output path for ONNX model
        model_name: Name for the model
        
    Returns:
        Export results
    """
    exporter = ONNXExporter()
    return exporter.export_model(model, X_sample, output_path, model_name)


def load_onnx_model(model_path: Union[str, Path]) -> ONNXInferenceEngine:
    """
    Quick function to load an ONNX model for inference.
    
    Args:
        model_path: Path to ONNX model
        
    Returns:
        ONNXInferenceEngine instance
    """
    return ONNXInferenceEngine(model_path)


def predict_with_onnx(model_path: Union[str, Path], X: np.ndarray) -> np.ndarray:
    """
    Quick function to make predictions with an ONNX model.
    
    Args:
        model_path: Path to ONNX model
        X: Input features
        
    Returns:
        Predictions
    """
    engine = ONNXInferenceEngine(model_path)
    return engine.predict(X)
