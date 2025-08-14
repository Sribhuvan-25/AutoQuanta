"""
AutoQuanta Analysis Package
Core ML functionality for tabular data analysis and modeling.
"""

# Import main classes and functions for easy access
from .loader import DataLoader, load_csv, load_data
from .profiler import DataProfiler, profile_csv, profile_dataframe, print_profile_summary
from .preprocessor import AutoPreprocessor, preprocess_data, create_preprocessor_from_profile
from .trainer import ModelTrainer, ModelEvaluator, train_models, evaluate_model
from .exporter import ONNXExporter, ONNXInferenceEngine, export_model, load_onnx_model, predict_with_onnx
from .utils import (
    DataProfile, 
    ColumnInfo, 
    TrainingConfig, 
    ModelResult,
    detect_task_type,
    check_target_variable,
    Timer
)

__version__ = "0.1.0"
__all__ = [
    # Main classes
    'DataLoader',
    'DataProfiler', 
    'AutoPreprocessor',
    'ModelTrainer',
    'ModelEvaluator',
    'ONNXExporter',
    'ONNXInferenceEngine',
    
    # Convenience functions
    'load_csv',
    'load_data',
    'profile_csv',
    'profile_dataframe', 
    'print_profile_summary',
    'preprocess_data',
    'create_preprocessor_from_profile',
    'train_models',
    'evaluate_model',
    'export_model',
    'load_onnx_model',
    'predict_with_onnx',
    
    # Data structures
    'DataProfile',
    'ColumnInfo',
    'TrainingConfig',
    'ModelResult',
    
    # Utilities
    'detect_task_type',
    'check_target_variable',
    'Timer'
]
