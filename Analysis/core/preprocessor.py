"""
Data preprocessing pipeline 
Handles missing values, categorical encoding, and feature preparation for ML models.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, Union
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import OneHotEncoder, LabelEncoder, StandardScaler, MinMaxScaler, RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from scipy import stats
import logging

from ..utils import (
    DataProfile, 
    ColumnInfo, 
    detect_task_type,
    validate_column_exists,
    Timer,
    DEFAULT_CONFIG
)

logger = logging.getLogger(__name__)


class DropColumnsTransformer(BaseEstimator, TransformerMixin):
    """Custom transformer to drop specified columns."""

    def __init__(self, columns_to_drop: List[str]):
        self.columns_to_drop = columns_to_drop

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        if isinstance(X, pd.DataFrame):
            return X.drop(columns=self.columns_to_drop, errors='ignore')
        else:
            # If it's a numpy array, we can't drop by name
            return X

    def get_feature_names_out(self, input_features=None):
        if input_features is None:
            return np.array([])
        return np.array([f for f in input_features if f not in self.columns_to_drop])


class OutlierHandler(BaseEstimator, TransformerMixin):
    """Custom transformer to detect and handle outliers in numeric data."""

    def __init__(self, method='iqr', threshold=1.5, strategy='clip'):
        """
        Initialize outlier handler.

        Args:
            method: 'iqr', 'zscore', or 'isolation'
            threshold: Threshold for outlier detection (1.5 for IQR, 3 for zscore)
            strategy: 'clip', 'remove', or 'transform'
        """
        self.method = method
        self.threshold = threshold
        self.strategy = strategy
        self.outlier_bounds_ = {}
        self.outlier_stats_ = {}

    def fit(self, X, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        for col in X.select_dtypes(include=[np.number]).columns:
            if self.method == 'iqr':
                Q1 = X[col].quantile(0.25)
                Q3 = X[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - self.threshold * IQR
                upper_bound = Q3 + self.threshold * IQR
                self.outlier_bounds_[col] = (lower_bound, upper_bound)

            elif self.method == 'zscore':
                mean = X[col].mean()
                std = X[col].std()
                lower_bound = mean - self.threshold * std
                upper_bound = mean + self.threshold * std
                self.outlier_bounds_[col] = (lower_bound, upper_bound)

            # Store outlier statistics
            outliers = self._detect_outliers_for_column(X[col], col)
            self.outlier_stats_[col] = {
                'count': len(outliers),
                'percentage': len(outliers) / len(X) * 100 if len(X) > 0 else 0
            }

        return self

    def transform(self, X):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        X_transformed = X.copy()

        for col in X_transformed.select_dtypes(include=[np.number]).columns:
            if col in self.outlier_bounds_:
                lower_bound, upper_bound = self.outlier_bounds_[col]

                if self.strategy == 'clip':
                    X_transformed[col] = X_transformed[col].clip(lower_bound, upper_bound)
                elif self.strategy == 'remove':
                    # Mark outliers as NaN (will be handled by imputer)
                    mask = (X_transformed[col] < lower_bound) | (X_transformed[col] > upper_bound)
                    X_transformed.loc[mask, col] = np.nan
                elif self.strategy == 'transform':
                    # Log transform for positive values
                    if (X_transformed[col] > 0).all():
                        X_transformed[col] = np.log1p(X_transformed[col])

        return X_transformed

    def _detect_outliers_for_column(self, series, col_name):
        """Detect outliers for a specific column."""
        if col_name not in self.outlier_bounds_:
            return []

        lower_bound, upper_bound = self.outlier_bounds_[col_name]
        outliers = series[(series < lower_bound) | (series > upper_bound)]
        return outliers.index.tolist()

    def get_outlier_report(self):
        """Get a report of outlier detection results."""
        return self.outlier_stats_.copy()


class AutoPreprocessor:
    """
    Automatic preprocessing pipeline for tabular data.
    Handles missing values, categorical encoding, and feature preparation.
    """
    
    def __init__(self,
                 target_column: str,
                 task_type: Optional[str] = None,
                 max_cardinality: int = None,
                 drop_id_columns: bool = True,
                 handle_missing: bool = True,
                 scaling_strategy: str = 'standard',
                 handle_outliers: bool = True,
                 outlier_method: str = 'iqr'):
        
        self.target_column = target_column
        self.task_type = task_type
        self.max_cardinality = max_cardinality or DEFAULT_CONFIG['max_cardinality']
        self.drop_id_columns = drop_id_columns
        self.handle_missing = handle_missing
        self.scaling_strategy = scaling_strategy
        self.handle_outliers = handle_outliers
        self.outlier_method = outlier_method
        
        # Will be set during fit
        self.pipeline = None
        self.feature_names_out = None
        self.dropped_columns = []
        self.label_encoder = None
        self.outlier_handler = None
        self.preprocessing_report = {}
        self.is_fitted = False
    
    def fit(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> 'AutoPreprocessor':
        with Timer("Fitting preprocessor"):
            # Validate inputs
            if y is None and self.target_column in X.columns:
                y = X[self.target_column]
                X = X.drop(columns=[self.target_column])
            elif y is None:
                raise ValueError(f"Target column '{self.target_column}' not found and y not provided")
            
            # Auto-detect task type if not provided
            if self.task_type is None:
                self.task_type = detect_task_type(y)
                logger.info(f"Auto-detected task type: {self.task_type}")
            
            # Identify columns to drop
            self.dropped_columns = self._identify_columns_to_drop(X)
            
            # Remove dropped columns
            X_clean = X.drop(columns=self.dropped_columns, errors='ignore')
            
            # Separate column types
            numeric_columns, categorical_columns = self._separate_column_types(X_clean)
            
            # Filter categorical columns by cardinality
            low_card_categorical, high_card_categorical = self._filter_by_cardinality(
                X_clean, categorical_columns
            )
            
            # Add high cardinality columns to dropped list
            self.dropped_columns.extend(high_card_categorical)
            
            # Create preprocessing steps
            transformers = self._create_transformers(numeric_columns, low_card_categorical)
            
            # Build the pipeline  
            if transformers:
                # Create column transformer with all valid columns
                preprocessor = ColumnTransformer(
                    transformers=transformers,
                    remainder='drop',  # Drop any remaining columns
                    sparse_threshold=0  # Return dense arrays
                )
                
                if self.dropped_columns:
                    # Pipeline: Drop columns then transform
                    self.pipeline = Pipeline([
                        ('drop_cols', DropColumnsTransformer(self.dropped_columns)),
                        ('preprocess', preprocessor)
                    ])
                else:
                    # Just transform
                    self.pipeline = Pipeline([('preprocess', preprocessor)])
            else:
                # Only drop columns if needed
                if self.dropped_columns:
                    self.pipeline = Pipeline([('drop_cols', DropColumnsTransformer(self.dropped_columns))])
                else:
                    # Pass-through (no processing needed)
                    self.pipeline = None
            
            # Fit the pipeline
            X_for_fit = X.copy()
            if self.pipeline is not None:
                self.pipeline.fit(X_for_fit)
            
            # Store feature names
            self.feature_names_out = self._get_feature_names_out(
                X_clean, numeric_columns, low_card_categorical
            )
            
            # Fit label encoder for target if classification
            if self.task_type == 'classification':
                self.label_encoder = LabelEncoder()
                self.label_encoder.fit(y)
            
            # Create preprocessing report
            self._create_preprocessing_report(X, y, numeric_columns, low_card_categorical)
            
            self.is_fitted = True
            logger.info(f"Preprocessing fitted: {len(self.feature_names_out)} features generated")
            
            return self
    
    def transform(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted before transforming")
        
        # Make a copy to avoid modifying the original
        X_copy = X.copy()
        
        # Remove target column if present
        if self.target_column in X_copy.columns:
            X_copy = X_copy.drop(columns=[self.target_column])
        
        if self.pipeline is None:
            return X_copy.values
        
        return self.pipeline.transform(X_copy)
    
    def transform_target(self, y: pd.Series) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted before transforming")
        
        if self.task_type == 'classification' and self.label_encoder is not None:
            return self.label_encoder.transform(y)
        else:
            # For regression, just convert to float
            return y.astype(float).values
    
    def fit_transform(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> Tuple[np.ndarray, np.ndarray]:
        # Extract target if not provided
        if y is None and self.target_column in X.columns:
            y = X[self.target_column]
        
        # Prepare features for fitting (without target)
        X_features = X.copy()
        if self.target_column in X_features.columns:
            X_features = X_features.drop(columns=[self.target_column])
        
        # Fit on features only
        self.fit(X_features, y)
        
        # Transform features
        X_transformed = self.transform(X_features)
        
        # Transform target
        y_transformed = self.transform_target(y)
        
        return X_transformed, y_transformed
    
    def _identify_columns_to_drop(self, X: pd.DataFrame) -> List[str]:
        columns_to_drop = []
        
        if self.drop_id_columns:
            # Identify potential ID columns with more intelligent criteria
            for col in X.columns:
                # Only consider as ID column if:
                # 1. All values are unique AND
                # 2. Dataset has more than 20 rows (avoid dropping features in small datasets) AND
                # 3. Column name suggests it's an ID (contains 'id', 'key', etc.) OR has string-like IDs
                is_all_unique = X[col].nunique() == len(X) and X[col].notna().all()
                is_large_dataset = len(X) > 20
                
                # Check if column name suggests it's an ID
                col_name_lower = str(col).lower()
                name_suggests_id = any(keyword in col_name_lower for keyword in 
                                     ['id', 'key', 'uuid', 'guid', 'index', '_id', 'pk'])
                
                # Check if values look like IDs (strings with numbers/letters)
                if is_all_unique and len(X) > 0:
                    sample_values = X[col].dropna().astype(str).head(5).tolist()
                    values_look_like_ids = any(
                        len(str(val)) > 8 or  # Long strings
                        any(char.isalpha() and char.isdigit() for char in str(val))  # Mixed alphanumeric
                        for val in sample_values
                    )
                else:
                    values_look_like_ids = False
                
                # Only drop if it's clearly an ID column
                should_drop = is_all_unique and (
                    (is_large_dataset and (name_suggests_id or values_look_like_ids)) or
                    (name_suggests_id and values_look_like_ids)  # Very confident it's an ID
                )
                
                if should_drop:
                    columns_to_drop.append(col)
                    logger.info(f"Dropping ID column: {col}")
                elif is_all_unique and len(X) <= 20:
                    logger.info(f"Keeping potentially useful column '{col}' (small dataset, all unique values)")
        
        return columns_to_drop
    
    def _separate_column_types(self, X: pd.DataFrame) -> Tuple[List[str], List[str]]:
        numeric_columns = []
        categorical_columns = []
        
        for col in X.columns:
            if pd.api.types.is_numeric_dtype(X[col]):
                numeric_columns.append(col)
            else:
                categorical_columns.append(col)
        
        return numeric_columns, categorical_columns
    
    def _filter_by_cardinality(self, X: pd.DataFrame, categorical_columns: List[str]) -> Tuple[List[str], List[str]]:
        low_cardinality = []
        high_cardinality = []
        
        for col in categorical_columns:
            cardinality = X[col].nunique()
            if cardinality <= self.max_cardinality:
                low_cardinality.append(col)
            else:
                high_cardinality.append(col)
                logger.warning(f"Dropping high cardinality column: {col} ({cardinality} categories)")
        
        return low_cardinality, high_cardinality
    
    def _create_transformers(self, numeric_columns: List[str], categorical_columns: List[str]) -> List[Tuple]:
        transformers = []

        # Numeric transformer with scaling
        if numeric_columns:
            numeric_steps = []

            # Add outlier handling (before imputation and scaling)
            if self.handle_outliers:
                # Extract threshold from outlier method
                if self.outlier_method == 'iqr':
                    outlier_threshold = 1.5
                elif self.outlier_method == 'zscore':
                    outlier_threshold = 3.0
                else:
                    outlier_threshold = 1.5  # default

                numeric_steps.append(('outlier_handler', OutlierHandler(
                    method=self.outlier_method,
                    threshold=outlier_threshold,
                    strategy='clip'  # Default to clipping outliers
                )))

            # Add missing value handling (after outlier handling)
            if self.handle_missing:
                numeric_steps.append(('imputer', SimpleImputer(strategy='median')))

            # Add scaling
            if self.scaling_strategy == 'standard':
                numeric_steps.append(('scaler', StandardScaler()))
            elif self.scaling_strategy == 'minmax':
                numeric_steps.append(('scaler', MinMaxScaler()))
            elif self.scaling_strategy == 'robust':
                numeric_steps.append(('scaler', RobustScaler()))
            elif self.scaling_strategy == 'none':
                pass  # No scaling

            if numeric_steps:
                numeric_transformer = Pipeline(numeric_steps)
                transformers.append(('num', numeric_transformer, numeric_columns))
            else:
                transformers.append(('num', 'passthrough', numeric_columns))
        
        # Categorical transformer
        if categorical_columns:
            categorical_steps = []
            
            if self.handle_missing:
                categorical_steps.append(
                    ('imputer', SimpleImputer(strategy='constant', fill_value='_missing_'))
                )
            
            categorical_steps.append(
                ('onehot', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'))
            )
            
            categorical_transformer = Pipeline(categorical_steps)
            transformers.append(('cat', categorical_transformer, categorical_columns))
        
        return transformers
    
    def _get_feature_names_out(self, X: pd.DataFrame, numeric_columns: List[str], categorical_columns: List[str]) -> List[str]:
        feature_names = []
        
        # Add numeric column names
        feature_names.extend(numeric_columns)
        
        # Add categorical feature names (after one-hot encoding)
        for col in categorical_columns:
            # Get unique categories (excluding NaN)
            categories = sorted(X[col].dropna().astype(str).unique())
            
            # OneHotEncoder drops the first category, so we start from index 1
            for cat in categories[1:]:
                feature_names.append(f"{col}_{cat}")
        
        return feature_names
    
    def _create_preprocessing_report(self, X: pd.DataFrame, y: pd.Series, 
                                   numeric_columns: List[str], categorical_columns: List[str]) -> None:
        self.preprocessing_report = {
            'target_column': self.target_column,
            'task_type': self.task_type,
            'original_features': len(X.columns),
            'final_features': len(self.feature_names_out),
            'dropped_columns': self.dropped_columns,
            'numeric_columns': numeric_columns,
            'categorical_columns': categorical_columns,
            'missing_value_strategy': {
                'numeric': 'median imputation' if self.handle_missing else 'none',
                'categorical': 'constant imputation (_missing_)' if self.handle_missing else 'none'
            },
            'outlier_handling': {
                'enabled': self.handle_outliers,
                'method': self.outlier_method if self.handle_outliers else 'none',
                'strategy': 'clip' if self.handle_outliers else 'none'
            },
            'scaling_strategy': {
                'numeric': self.scaling_strategy
            },
            'encoding_strategy': {
                'categorical': f'one-hot encoding (max cardinality: {self.max_cardinality})'
            },
            'target_preprocessing': {
                'classification': 'label encoding' if self.task_type == 'classification' else 'none',
                'regression': 'float conversion' if self.task_type == 'regression' else 'none'
            }
        }
    
    def get_feature_names_out(self) -> List[str]:
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted first")
        return self.feature_names_out.copy()
    
    def get_preprocessing_report(self) -> Dict[str, Any]:
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted first")
        return self.preprocessing_report.copy()
    
    def inverse_transform_target(self, y_transformed: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Preprocessor must be fitted first")
        
        if self.task_type == 'classification' and self.label_encoder is not None:
            return self.label_encoder.inverse_transform(y_transformed)
        else:
            return y_transformed


def create_preprocessor_from_profile(profile: DataProfile, 
                                   target_column: str,
                                   task_type: Optional[str] = None) -> AutoPreprocessor:

    # Identify columns to drop based on profile warnings
    drop_id_columns = any(
        "ID column" in " ".join(col.warnings) 
        for col in profile.columns
    )
    
    # Determine max cardinality based on data
    categorical_columns = [col for col in profile.columns if col.dtype == "categorical"]
    if categorical_columns:
        max_cardinality = min(50, max(col.unique_count for col in categorical_columns if col.unique_count <= 100))
    else:
        max_cardinality = DEFAULT_CONFIG['max_cardinality']
    
    return AutoPreprocessor(
        target_column=target_column,
        task_type=task_type,
        max_cardinality=max_cardinality,
        drop_id_columns=drop_id_columns,
        handle_missing=True
    )


# Convenience functions
def preprocess_data(df: pd.DataFrame, 
                   target_column: str,
                   task_type: Optional[str] = None,
                   **kwargs) -> Tuple[np.ndarray, np.ndarray, AutoPreprocessor]:
    """
    Quick function to preprocess data.
    
    Args:
        df: Input DataFrame
        target_column: Name of target column
        task_type: Task type (auto-detected if None)
        **kwargs: Additional arguments for AutoPreprocessor
        
    Returns:
        Tuple of (X_transformed, y_transformed, fitted_preprocessor)
    """
    preprocessor = AutoPreprocessor(target_column=target_column, task_type=task_type, **kwargs)
    X_transformed, y_transformed = preprocessor.fit_transform(df)
    return X_transformed, y_transformed, preprocessor
