"""
Data profiling and EDA functionality.
Analyzes datasets to provide comprehensive statistics and quality assessments.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
import logging

from ..utils import (
    ColumnInfo, 
    DataProfile, 
    memory_usage_mb, 
    safe_divide,
    Timer,
    detect_task_type,
    print_data_summary
)
from .loader import DataLoader

logger = logging.getLogger(__name__)


class DataProfiler:
    """Comprehensive data profiling and EDA analysis."""
    
    def __init__(self, max_categories_shown: int = 10):
        """
        Initialize the data profiler.
        
        Args:
            max_categories_shown: Maximum number of top categories to show in stats
        """
        self.max_categories_shown = max_categories_shown
        self.loader = DataLoader()
    
    def profile_dataframe(self, df: pd.DataFrame, file_path: Optional[str] = None) -> DataProfile:
        """
        Create a comprehensive profile of a DataFrame.
        
        Args:
            df: DataFrame to profile
            file_path: Optional path to the source file
            
        Returns:
            DataProfile object with complete analysis
        """
        with Timer("Data profiling"):
            # Basic information
            shape = df.shape
            memory_mb = memory_usage_mb(df)
            
            # Profile each column
            column_profiles = []
            for col in df.columns:
                col_profile = self._profile_column(df, col)
                column_profiles.append(col_profile)
            
            # Calculate summary statistics
            missing_summary = self._calculate_missing_summary(df)
            dtypes_summary = self._calculate_dtypes_summary(df)
            warnings = self._generate_global_warnings(df, column_profiles)
            
            return DataProfile(
                file_path=file_path or "Unknown",
                shape=shape,
                columns=column_profiles,
                missing_summary=missing_summary,
                warnings=warnings,
                memory_usage_mb=memory_mb,
                dtypes_summary=dtypes_summary
            )
    
    def profile_csv(self, file_path: Union[str, Path]) -> DataProfile:
        df = self.loader.load_csv(file_path)
        return self.profile_dataframe(df, str(file_path))
    
    def _profile_column(self, df: pd.DataFrame, column_name: str) -> ColumnInfo:
        """
        Create a detailed profile for a single column.
        
        Args:
            df: DataFrame containing the column
            column_name: Name of the column to profile
            
        Returns:
            ColumnInfo object with detailed statistics
        """
        series = df[column_name]
        
        # Basic counts
        total_count = len(series)
        missing_count = series.isnull().sum()
        non_missing_count = total_count - missing_count
        unique_count = series.nunique()
        
        # Calculate percentages
        missing_pct = safe_divide(missing_count, total_count) * 100
        unique_pct = safe_divide(unique_count, total_count) * 100
        
        # Memory usage
        memory_usage = series.memory_usage(deep=True)
        
        # Determine data type and calculate specific statistics
        dtype_str, stats, warnings = self._analyze_column_type(series)
        
        return ColumnInfo(
            name=column_name,
            dtype=dtype_str,
            missing_count=missing_count,
            missing_percentage=missing_pct,
            unique_count=unique_count,
            unique_percentage=unique_pct,
            memory_usage=memory_usage,
            stats=stats,
            warnings=warnings
        )
    
    def _analyze_column_type(self, series: pd.Series) -> tuple[str, Dict[str, Any], List[str]]:
        warnings = []
        
        # Determine the data type
        if pd.api.types.is_numeric_dtype(series):
            dtype_str = "numeric"
            stats = self._calculate_numeric_stats(series)
            
            # Add numeric-specific warnings
            if series.isnull().sum() > len(series) * 0.5:
                warnings.append("High missing value rate (>50%)")
            
            # Check for potential outliers (simple IQR method)
            if stats.get('q75') and stats.get('q25'):
                iqr = stats['q75'] - stats['q25']
                if iqr > 0:
                    lower_bound = stats['q25'] - 1.5 * iqr
                    upper_bound = stats['q75'] + 1.5 * iqr
                    outliers = series[(series < lower_bound) | (series > upper_bound)]
                    if len(outliers) > len(series) * 0.05:  # More than 5% outliers
                        warnings.append(f"Potential outliers detected ({len(outliers)} values)")
        
        elif pd.api.types.is_datetime64_any_dtype(series):
            dtype_str = "datetime"
            stats = self._calculate_datetime_stats(series)
            
        elif pd.api.types.is_bool_dtype(series):
            dtype_str = "boolean"
            stats = self._calculate_boolean_stats(series)
            
        else:
            dtype_str = "categorical"
            stats = self._calculate_categorical_stats(series)
            
            # Add categorical-specific warnings
            unique_count = series.nunique()
            if unique_count == len(series) and series.isnull().sum() == 0:
                warnings.append("All values are unique (possible ID column)")
            elif unique_count > 100:
                warnings.append(f"High cardinality ({unique_count} categories)")
            elif unique_count == 1:
                warnings.append("Only one unique value (constant column)")
        
        return dtype_str, stats, warnings
    
    def _calculate_numeric_stats(self, series: pd.Series) -> Dict[str, Any]:
        """Calculate statistics for numeric columns."""
        if series.dropna().empty:
            return {"error": "No non-null values"}
        
        stats = {
            "count": int(series.count()),
            "mean": float(series.mean()),
            "std": float(series.std()),
            "min": float(series.min()),
            "max": float(series.max()),
            "median": float(series.median()),
            "q25": float(series.quantile(0.25)),
            "q75": float(series.quantile(0.75)),
        }
        
        # Add additional statistics
        try:
            stats["skewness"] = float(series.skew())
            stats["kurtosis"] = float(series.kurtosis())
        except:
            pass
        
        # Check if values are integers
        non_null_series = series.dropna()
        if len(non_null_series) > 0:
            is_integer = non_null_series.apply(lambda x: float(x).is_integer() if pd.notnull(x) else True).all()
            stats["appears_integer"] = bool(is_integer)
        
        return stats
    
    def _calculate_categorical_stats(self, series: pd.Series) -> Dict[str, Any]:
        value_counts = series.value_counts()
        
        stats = {
            "top_categories": value_counts.head(self.max_categories_shown).to_dict(),
            "category_count": len(value_counts),
        }
        
        if len(value_counts) > 0:
            stats["most_frequent"] = value_counts.index[0]
            stats["most_frequent_count"] = int(value_counts.iloc[0])
            stats["most_frequent_percentage"] = float(value_counts.iloc[0] / len(series) * 100)
        
        # Calculate entropy (measure of diversity)
        if len(value_counts) > 1:
            probabilities = value_counts / len(series)
            entropy = -np.sum(probabilities * np.log2(probabilities + 1e-10))
            stats["entropy"] = float(entropy)
        
        return stats
    
    def _calculate_datetime_stats(self, series: pd.Series) -> Dict[str, Any]:
        if series.dropna().empty:
            return {"error": "No non-null values"}
        
        stats = {
            "min_date": series.min().isoformat() if pd.notnull(series.min()) else None,
            "max_date": series.max().isoformat() if pd.notnull(series.max()) else None,
        }
        
        # Calculate date range
        if pd.notnull(series.min()) and pd.notnull(series.max()):
            date_range = series.max() - series.min()
            stats["date_range_days"] = int(date_range.days)
        
        return stats
    
    def _calculate_boolean_stats(self, series: pd.Series) -> Dict[str, Any]:
        value_counts = series.value_counts()
        
        stats = {
            "true_count": int(value_counts.get(True, 0)),
            "false_count": int(value_counts.get(False, 0)),
        }
        
        total_valid = stats["true_count"] + stats["false_count"]
        if total_valid > 0:
            stats["true_percentage"] = float(stats["true_count"] / total_valid * 100)
            stats["false_percentage"] = float(stats["false_count"] / total_valid * 100)
        
        return stats
    
    def _calculate_missing_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        total_cells = df.shape[0] * df.shape[1]
        total_missing = df.isnull().sum().sum()
        
        columns_with_missing = df.columns[df.isnull().any()].tolist()
        
        return {
            "total_missing": int(total_missing),
            "total_cells": int(total_cells),
            "missing_percentage": float(safe_divide(total_missing, total_cells) * 100),
            "columns_with_missing": len(columns_with_missing),
            "columns_with_missing_list": columns_with_missing
        }
    
    def _calculate_dtypes_summary(self, df: pd.DataFrame) -> Dict[str, int]:
        dtype_counts = {}
        
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                dtype = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                dtype = "datetime"
            elif pd.api.types.is_bool_dtype(df[col]):
                dtype = "boolean"
            else:
                dtype = "categorical"
            
            dtype_counts[dtype] = dtype_counts.get(dtype, 0) + 1
        
        return dtype_counts
    
    def _generate_global_warnings(self, df: pd.DataFrame, column_profiles: List[ColumnInfo]) -> List[str]:
        warnings = []
        
        # Check for potential ID columns
        id_columns = [col.name for col in column_profiles if "ID column" in " ".join(col.warnings)]
        if id_columns:
            warnings.append(f"Potential ID columns detected: {', '.join(id_columns)}")
        
        # Check for high missing rates globally
        high_missing_cols = [col.name for col in column_profiles if col.missing_percentage > 30]
        if high_missing_cols:
            warnings.append(f"Columns with >30% missing values: {', '.join(high_missing_cols)}")
        
        # Check for constant columns
        constant_cols = [col.name for col in column_profiles if col.unique_count <= 1]
        if constant_cols:
            warnings.append(f"Constant columns (≤1 unique value): {', '.join(constant_cols)}")
        
        # Check for high cardinality categorical columns
        high_card_cols = [col.name for col in column_profiles 
                         if col.dtype == "categorical" and col.unique_count > 50]
        if high_card_cols:
            warnings.append(f"High cardinality categorical columns: {', '.join(high_card_cols)}")
        
        # Check for duplicate rows
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            warnings.append(f"Duplicate rows detected: {duplicate_count}")
        
        # Check for very wide datasets
        if df.shape[1] > 1000:
            warnings.append(f"Very wide dataset ({df.shape[1]} columns) - consider feature selection")
        
        # Check for memory usage
        memory_mb = memory_usage_mb(df)
        if memory_mb > 1000:  # More than 1GB
            warnings.append(f"Large memory usage: {memory_mb:.1f} MB")
        
        return warnings
    
    def get_column_recommendations(self, profile: DataProfile, target_column: Optional[str] = None) -> Dict[str, List[str]]:
        """
        Get recommendations for data preprocessing based on the profile.
        
        Args:
            profile: DataProfile object
            target_column: Name of the target column (if any)
            
        Returns:
            Dictionary with different types of recommendations
        """
        recommendations = {
            "drop_columns": [],
            "handle_missing": [],
            "encode_categorical": [],
            "scale_features": [],
            "general": []
        }
        
        for col in profile.columns:
            # Skip target column in recommendations
            if target_column and col.name == target_column:
                continue
            
            # Recommend dropping ID-like columns
            if "ID column" in " ".join(col.warnings):
                recommendations["drop_columns"].append(
                    f"{col.name}: Appears to be an ID column (all unique values)"
                )
            
            # Recommend dropping constant columns
            if col.unique_count <= 1:
                recommendations["drop_columns"].append(
                    f"{col.name}: Constant column (only {col.unique_count} unique value)"
                )
            
            # Recommend handling high missing rates
            if col.missing_percentage > 50:
                recommendations["handle_missing"].append(
                    f"{col.name}: High missing rate ({col.missing_percentage:.1f}%)"
                )
            elif col.missing_percentage > 10:
                recommendations["handle_missing"].append(
                    f"{col.name}: Moderate missing rate ({col.missing_percentage:.1f}%)"
                )
            
            # Recommend encoding high cardinality categoricals
            if col.dtype == "categorical" and col.unique_count > 50:
                recommendations["encode_categorical"].append(
                    f"{col.name}: High cardinality ({col.unique_count} categories) - consider target encoding"
                )
            elif col.dtype == "categorical" and col.unique_count <= 50:
                recommendations["encode_categorical"].append(
                    f"{col.name}: Moderate cardinality ({col.unique_count} categories) - one-hot encoding suitable"
                )
        
        # General recommendations
        total_missing_pct = profile.missing_summary["missing_percentage"]
        if total_missing_pct > 20:
            recommendations["general"].append(
                f"High overall missing rate ({total_missing_pct:.1f}%) - consider data quality investigation"
            )
        
        if profile.shape[1] > 100:
            recommendations["general"].append(
                f"Many features ({profile.shape[1]}) - consider feature selection or dimensionality reduction"
            )
        
        return recommendations
    
    def generate_visualization_data(self, profile: DataProfile) -> Dict[str, Any]:
        """Generate data for frontend visualization."""
        viz_data = {
            'feature_distributions': {},
            'correlation_matrix': {},
            'missing_data': {},
            'data_overview': {}
        }
        
        # Feature distributions
        for col in profile.columns:
            if col.dtype in ['int64', 'float64']:
                # For numeric columns, include basic stats
                viz_data['feature_distributions'][col.name] = {
                    'dtype': col.dtype,
                    'mean': col.stats.get('mean', 0),
                    'std': col.stats.get('std', 0),
                    'min': col.stats.get('min', 0),
                    'max': col.stats.get('max', 0),
                    'missing_count': col.missing_count,
                    'missing_percentage': col.missing_percentage
                }
            else:
                # For categorical columns
                viz_data['feature_distributions'][col.name] = {
                    'dtype': col.dtype,
                    'unique_count': col.unique_count,
                    'missing_count': col.missing_count,
                    'missing_percentage': col.missing_percentage
                }
        
        # Missing data pattern
        viz_data['missing_data'] = {
            'total_missing': profile.missing_summary['total_missing'],
            'missing_percentage': profile.missing_summary['missing_percentage'],
            'columns_with_missing': profile.missing_summary['columns_with_missing'],
            'missing_by_column': {
                col.name: col.missing_percentage 
                for col in profile.columns 
                if col.missing_count > 0
            }
        }
        
        # Data overview
        viz_data['data_overview'] = {
            'shape': profile.shape,
            'memory_usage_mb': profile.memory_usage_mb,
            'dtypes_summary': profile.dtypes_summary,
            'warnings': profile.warnings
        }
        
        return viz_data


# Convenience functions
def profile_csv(file_path: Union[str, Path]) -> DataProfile:
    profiler = DataProfiler()
    return profiler.profile_csv(file_path)


def profile_dataframe(df: pd.DataFrame, file_path: Optional[str] = None) -> DataProfile:
    profiler = DataProfiler()
    return profiler.profile_dataframe(df, file_path)


def print_profile_summary(profile: DataProfile) -> None:
    print_data_summary(profile)
