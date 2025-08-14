"""
Data structures and types for AutoQuanta ML engine.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd


@dataclass
class ColumnInfo:
    """Information about a single column in the dataset."""
    name: str
    dtype: str
    missing_count: int
    missing_percentage: float
    unique_count: int
    unique_percentage: float
    memory_usage: int
    stats: Dict[str, Any]
    warnings: List[str]


@dataclass
class DataProfile:
    """Complete profile of a dataset."""
    file_path: str
    shape: Tuple[int, int]
    columns: List[ColumnInfo]
    missing_summary: Dict[str, Any]
    warnings: List[str]
    memory_usage_mb: float
    dtypes_summary: Dict[str, int]


@dataclass
class TrainingConfig:
    """Configuration for model training."""
    target_column: str
    task_type: str  # 'classification' or 'regression'
    test_size: float = 0.2
    cv_folds: int = 5
    random_seed: int = 42
    models_to_try: Optional[List[str]] = None
    
    def __post_init__(self):
        if self.models_to_try is None:
            self.models_to_try = ['rf', 'lgbm', 'xgb']


@dataclass
class ModelResult:
    """Results from training a single model."""
    model_name: str
    model_object: Any
    cv_scores: List[float]
    mean_score: float
    std_score: float
    feature_importance: Optional[Dict[str, float]]
    training_time: float
    best_params: Optional[Dict[str, Any]] = None


# Constants for model parameters
DEFAULT_MODEL_PARAMS = {
    'rf': {
        'n_estimators': [50, 100, 200],
        'max_depth': [5, 10, 15, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    },
    'lgbm': {
        'n_estimators': [50, 100, 200],
        'max_depth': [5, 10, 15, -1],
        'learning_rate': [0.01, 0.1, 0.2],
        'num_leaves': [31, 50, 100]
    },
    'xgb': {
        'n_estimators': [50, 100, 200],
        'max_depth': [3, 6, 10],
        'learning_rate': [0.01, 0.1, 0.2],
        'subsample': [0.8, 0.9, 1.0]
    }
}

# Supported file extensions
SUPPORTED_EXTENSIONS = {'.csv', '.tsv'}

# Default configuration
DEFAULT_CONFIG = {
    'test_size': 0.2,
    'cv_folds': 5,
    'random_seed': 42,
    'max_cardinality': 50,  # For categorical encoding
    'sample_size': 10000,  # For large file profiling
}
