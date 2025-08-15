"""
AutoQuanta Analysis Package
Core ML functionality for tabular data analysis and modeling.
"""

# Import main classes and functions for easy access
from .core import (
    DataLoader, load_csv, load_data,
    DataProfiler, profile_csv, profile_dataframe, print_profile_summary,
    AutoPreprocessor, preprocess_data, create_preprocessor_from_profile,
    ModelTrainer, ModelEvaluator, train_models, evaluate_model,
    ONNXExporter, ONNXInferenceEngine, export_model, load_onnx_model, predict_with_onnx
)

from .utils import (
    DataProfile, 
    ColumnInfo, 
    TrainingConfig, 
    FoldResult,
    ModelTrainingResult,
    TrainingResults,
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
    'FoldResult',
    'ModelTrainingResult',
    'TrainingResults',
    
    # Utilities
    'detect_task_type',
    'check_target_variable',
    'Timer'
]
