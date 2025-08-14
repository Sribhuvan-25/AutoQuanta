"""
Helper functions and utilities for AutoQuanta ML engine.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Union
from pathlib import Path
import pandas as pd
import numpy as np

from .data_structures import DataProfile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def validate_file_path(file_path: Union[str, Path]) -> Path:
    """Validate that a file path exists and is readable."""
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    
    if not path.is_file():
        raise ValueError(f"Path is not a file: {path}")
    
    # Check if file is readable
    try:
        with open(path, 'r') as f:
            pass
    except PermissionError:
        raise PermissionError(f"File is not readable: {path}")
    
    return path


def detect_task_type(y: pd.Series) -> str:
    # Check if numeric
    if pd.api.types.is_numeric_dtype(y):
        # If integer and small number of unique values, likely classification
        if pd.api.types.is_integer_dtype(y):
            unique_count = y.nunique()
            if unique_count <= 20:  # Arbitrary threshold
                return 'classification'
        
        # Check if all values are integers (even if stored as float)
        if y.dropna().apply(lambda x: x.is_integer() if isinstance(x, (int, float)) else False).all():
            unique_count = y.nunique()
            if unique_count <= 20:
                return 'classification'
        
        # Otherwise, regression
        return 'regression'
    
    else:
        # Non-numeric is classification
        return 'classification'


def memory_usage_mb(df: pd.DataFrame) -> float:
    """Calculate memory usage of DataFrame in MB."""
    return df.memory_usage(deep=True).sum() / 1024 / 1024


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    return numerator / denominator if denominator != 0 else default


def get_sample_data(df: pd.DataFrame, n_samples: int = 1000, random_state: int = 42) -> pd.DataFrame:
    if len(df) <= n_samples:
        return df.copy()
    
    return df.sample(n=n_samples, random_state=random_state)


def format_bytes(bytes_value: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f} PB"


def format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f} minutes"
    else:
        hours = seconds / 3600
        return f"{hours:.1f} hours"


class Timer:
    
    def __init__(self, description: str = "Operation"):
        self.description = description
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        logger.info(f"Starting: {self.description}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        duration = self.end_time - self.start_time
        logger.info(f"Completed: {self.description} in {format_duration(duration)}")
    
    @property
    def elapsed(self) -> float:
        if self.start_time is None:
            return 0.0
        end = self.end_time or time.time()
        return end - self.start_time


def validate_column_exists(df: pd.DataFrame, column_name: str) -> None:
    if column_name not in df.columns:
        available_columns = ", ".join(df.columns.tolist())
        raise ValueError(
            f"Column '{column_name}' not found. "
            f"Available columns: {available_columns}"
        )


def check_target_variable(df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
    validate_column_exists(df, target_column)
    
    target = df[target_column]
    
    info = {
        'column_name': target_column,
        'dtype': str(target.dtype),
        'unique_count': target.nunique(),
        'missing_count': target.isnull().sum(),
        'missing_percentage': (target.isnull().sum() / len(target)) * 100,
        'task_type': detect_task_type(target),
        'warnings': []
    }
    
    # Check for issues
    if info['missing_count'] > 0:
        info['warnings'].append(f"Target has {info['missing_count']} missing values")
    
    if info['task_type'] == 'classification':
        if info['unique_count'] < 2:
            info['warnings'].append("Classification target has only 1 unique value")
        elif info['unique_count'] > 50:
            info['warnings'].append(f"Many unique values ({info['unique_count']}) for classification")
        
        # Check for class imbalance
        value_counts = target.value_counts()
        if len(value_counts) >= 2:
            max_class_pct = (value_counts.iloc[0] / len(target)) * 100
            if max_class_pct > 90:
                info['warnings'].append(f"Severe class imbalance: {max_class_pct:.1f}% majority class")
    
    return info


def print_data_summary(profile: DataProfile) -> None:
    print(f"\n📊 Dataset Summary: {Path(profile.file_path).name}")
    print(f"Shape: {profile.shape[0]:,} rows × {profile.shape[1]} columns")
    print(f"Memory Usage: {profile.memory_usage_mb:.1f} MB")
    
    print(f"\n📋 Column Types:")
    for dtype, count in profile.dtypes_summary.items():
        print(f"  {dtype}: {count} columns")
    
    if profile.missing_summary['total_missing'] > 0:
        print(f"\n⚠️  Missing Values: {profile.missing_summary['total_missing']:,} "
              f"({profile.missing_summary['missing_percentage']:.1f}%)")
        print(f"  Columns with missing: {profile.missing_summary['columns_with_missing']}")
    
    if profile.warnings:
        print(f"\n🔍 Data Quality Warnings:")
        for warning in profile.warnings:
            print(f"  • {warning}")
    
    print()
