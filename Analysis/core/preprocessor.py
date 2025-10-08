"""
Data preprocessing pipeline 
Handles missing values, categorical encoding, and feature preparation for ML models.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, Union
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import OneHotEncoder, LabelEncoder, StandardScaler, MinMaxScaler, RobustScaler, OrdinalEncoder, PolynomialFeatures, KBinsDiscretizer
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer
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


class TargetEncoder(BaseEstimator, TransformerMixin):
    """Target encoder for categorical variables."""

    def __init__(self, smoothing=1.0, min_samples_leaf=1):
        self.smoothing = smoothing
        self.min_samples_leaf = min_samples_leaf
        self.target_mean_ = None
        self.encodings_ = {}

    def fit(self, X, y):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        self.target_mean_ = y.mean()

        for col in X.columns:
            # Calculate mean target for each unique category
            category_stats = {}
            for category in X[col].unique():
                if pd.notna(category):
                    mask = X[col] == category
                    category_mean = y[mask].mean()
                    category_count = mask.sum()

                    # Apply smoothing
                    smoothed_mean = (category_count * category_mean + self.smoothing * self.target_mean_) / (category_count + self.smoothing)
                    category_stats[category] = smoothed_mean

            # Store encodings for this column
            self.encodings_[col] = category_stats

        return self

    def transform(self, X):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        X_encoded = X.copy()

        for col in X.columns:
            if col in self.encodings_:
                # Apply encoding with fallback to global mean
                X_encoded[col] = X[col].map(self.encodings_[col]).fillna(self.target_mean_)

        return X_encoded.values


class FrequencyEncoder(BaseEstimator, TransformerMixin):
    """Frequency encoder for categorical variables."""

    def __init__(self):
        self.frequency_maps_ = {}

    def fit(self, X, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        for col in X.columns:
            self.frequency_maps_[col] = X[col].value_counts().to_dict()

        return self

    def transform(self, X):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        X_encoded = X.copy()

        for col in X.columns:
            if col in self.frequency_maps_:
                X_encoded[col] = X[col].map(self.frequency_maps_[col]).fillna(0)

        return X_encoded.values

class FeatureEngineer(BaseEstimator, TransformerMixin):
    """Feature engineering transformer for creating new features."""

    def __init__(self,
                 create_polynomial: bool = False,
                 polynomial_degree: int = 2,
                 create_interactions: bool = False,
                 interaction_pairs: Optional[List[Tuple[str, str]]] = None,
                 create_binning: bool = False,
                 binning_strategy: str = 'quantile',
                 n_bins: int = 5):
        """
        Initialize feature engineer.

        Args:
            create_polynomial: Create polynomial features
            polynomial_degree: Degree for polynomial features
            create_interactions: Create interaction terms
            interaction_pairs: Specific column pairs for interactions (auto-detected if None)
            create_binning: Create binned versions of continuous features
            binning_strategy: 'uniform', 'quantile', or 'kmeans'
            n_bins: Number of bins for discretization
        """
        self.create_polynomial = create_polynomial
        self.polynomial_degree = polynomial_degree
        self.create_interactions = create_interactions
        self.interaction_pairs = interaction_pairs
        self.create_binning = create_binning
        self.binning_strategy = binning_strategy
        self.n_bins = n_bins

        # Will be set during fit
        self.feature_names_in_ = None
        self.feature_names_out_ = None
        self.numeric_columns_ = None
        self.poly_transformer_ = None
        self.binning_transformers_ = {}
        self.selected_interactions_ = []

    def fit(self, X, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        self.feature_names_in_ = list(X.columns)
        self.numeric_columns_ = list(X.select_dtypes(include=[np.number]).columns)

        # Fit polynomial features if requested
        if self.create_polynomial and len(self.numeric_columns_) > 0:
            self.poly_transformer_ = PolynomialFeatures(
                degree=self.polynomial_degree,
                include_bias=False,
                interaction_only=False
            )
            X_numeric = X[self.numeric_columns_]
            self.poly_transformer_.fit(X_numeric)

        # Determine interaction pairs
        if self.create_interactions:
            if self.interaction_pairs is None:
                # Auto-select important interaction pairs (limit to avoid explosion)
                self.selected_interactions_ = self._select_interaction_pairs(X, y)
            else:
                self.selected_interactions_ = [
                    (col1, col2) for col1, col2 in self.interaction_pairs
                    if col1 in X.columns and col2 in X.columns
                ]

        # Fit binning transformers
        if self.create_binning:
            for col in self.numeric_columns_:
                if X[col].nunique() > self.n_bins:  # Only bin if enough unique values
                    binning_transformer = KBinsDiscretizer(
                        n_bins=self.n_bins,
                        encode='ordinal',
                        strategy=self.binning_strategy
                    )
                    binning_transformer.fit(X[[col]])
                    self.binning_transformers_[col] = binning_transformer

        # Generate output feature names
        self.feature_names_out_ = self._generate_feature_names(X)

        return self

    def transform(self, X):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X, columns=self.feature_names_in_)

        X_engineered = X.copy()

        # Add polynomial features
        if self.create_polynomial and self.poly_transformer_ is not None:
            X_numeric = X[self.numeric_columns_]
            poly_features = self.poly_transformer_.transform(X_numeric)
            poly_feature_names = self.poly_transformer_.get_feature_names_out(self.numeric_columns_)

            # Add polynomial features (excluding original features which are duplicated)
            for i, feature_name in enumerate(poly_feature_names):
                if feature_name not in self.numeric_columns_:  # Skip original features
                    X_engineered[f'poly_{feature_name}'] = poly_features[:, i]

        # Add interaction features
        if self.create_interactions:
            for col1, col2 in self.selected_interactions_:
                if col1 in X.columns and col2 in X.columns:
                    # Create interaction term
                    interaction_name = f'{col1}_x_{col2}'
                    if pd.api.types.is_numeric_dtype(X[col1]) and pd.api.types.is_numeric_dtype(X[col2]):
                        X_engineered[interaction_name] = X[col1] * X[col2]
                    else:
                        # For categorical interactions, create combined categories
                        X_engineered[interaction_name] = X[col1].astype(str) + '_' + X[col2].astype(str)

        # Add binned features
        if self.create_binning:
            for col, transformer in self.binning_transformers_.items():
                if col in X.columns:
                    binned_values = transformer.transform(X[[col]])
                    X_engineered[f'{col}_binned'] = binned_values.flatten()

        return X_engineered

    def _select_interaction_pairs(self, X, y, max_pairs=10):
        """Automatically select promising interaction pairs."""
        numeric_cols = self.numeric_columns_
        categorical_cols = [col for col in X.columns if col not in numeric_cols]

        interaction_pairs = []

        # Numeric x Numeric interactions (top correlations)
        if len(numeric_cols) >= 2:
            from itertools import combinations
            num_pairs = list(combinations(numeric_cols, 2))
            # Limit to avoid feature explosion
            interaction_pairs.extend(num_pairs[:min(5, len(num_pairs))])

        # Numeric x Categorical interactions (if any)
        if len(numeric_cols) >= 1 and len(categorical_cols) >= 1:
            # Add a few promising numeric-categorical pairs
            for num_col in numeric_cols[:3]:  # Limit to top 3 numeric columns
                for cat_col in categorical_cols[:2]:  # Limit to top 2 categorical
                    interaction_pairs.append((num_col, cat_col))

        return interaction_pairs[:max_pairs]  # Limit total interactions

    def _generate_feature_names(self, X):
        """Generate names for all output features."""
        feature_names = list(X.columns)  # Start with original features

        # Add polynomial feature names
        if self.create_polynomial and self.poly_transformer_ is not None:
            poly_names = self.poly_transformer_.get_feature_names_out(self.numeric_columns_)
            for name in poly_names:
                if name not in self.numeric_columns_:  # Skip duplicated original features
                    feature_names.append(f'poly_{name}')

        # Add interaction feature names
        if self.create_interactions:
            for col1, col2 in self.selected_interactions_:
                feature_names.append(f'{col1}_x_{col2}')

        # Add binned feature names
        if self.create_binning:
            for col in self.binning_transformers_.keys():
                feature_names.append(f'{col}_binned')

        return feature_names

    def get_feature_names_out(self, input_features=None):
        """Get output feature names."""
        return self.feature_names_out_


class DataValidator(BaseEstimator, TransformerMixin):
    """Data validation and cleaning transformer."""

    def __init__(self,
                 remove_duplicates: bool = True,
                 fix_data_types: bool = True,
                 handle_mixed_types: bool = True,
                 remove_constant_features: bool = True,
                 constant_threshold: float = 0.95,
                 remove_high_missing: bool = True,
                 missing_threshold: float = 0.8):
        """
        Initialize data validator.

        Args:
            remove_duplicates: Remove duplicate rows
            fix_data_types: Auto-fix data type inconsistencies
            handle_mixed_types: Handle mixed data types in columns
            remove_constant_features: Remove features with little variance
            constant_threshold: Threshold for constant feature removal (0.95 = 95% same values)
            remove_high_missing: Remove columns with too many missing values
            missing_threshold: Threshold for high missing value removal (0.8 = 80% missing)
        """
        self.remove_duplicates = remove_duplicates
        self.fix_data_types = fix_data_types
        self.handle_mixed_types = handle_mixed_types
        self.remove_constant_features = remove_constant_features
        self.constant_threshold = constant_threshold
        self.remove_high_missing = remove_high_missing
        self.missing_threshold = missing_threshold

        # Will be set during fit
        self.columns_to_drop_ = []
        self.dtype_fixes_ = {}
        self.validation_report_ = {}
        self.duplicate_count_ = 0

    def fit(self, X, y=None):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        self.validation_report_ = {
            'original_shape': X.shape,
            'issues_found': [],
            'fixes_applied': [],
            'columns_dropped': [],
            'data_quality_score': 0.0
        }

        # Check for duplicates
        if self.remove_duplicates:
            self.duplicate_count_ = X.duplicated().sum()
            if self.duplicate_count_ > 0:
                self.validation_report_['issues_found'].append(f'Found {self.duplicate_count_} duplicate rows')
                self.validation_report_['fixes_applied'].append('Duplicate rows will be removed')

        # Check for mixed data types and fix them
        if self.fix_data_types or self.handle_mixed_types:
            self.dtype_fixes_ = self._analyze_data_types(X)

        # Identify constant/near-constant features
        if self.remove_constant_features:
            constant_cols = self._identify_constant_features(X)
            self.columns_to_drop_.extend(constant_cols)
            if constant_cols:
                self.validation_report_['issues_found'].append(f'Found {len(constant_cols)} constant/near-constant features')
                self.validation_report_['columns_dropped'].extend(constant_cols)

        # Identify high missing value columns
        if self.remove_high_missing:
            high_missing_cols = self._identify_high_missing_columns(X)
            self.columns_to_drop_.extend(high_missing_cols)
            if high_missing_cols:
                self.validation_report_['issues_found'].append(f'Found {len(high_missing_cols)} columns with >={self.missing_threshold*100}% missing values')
                self.validation_report_['columns_dropped'].extend(high_missing_cols)

        # Calculate data quality score
        self.validation_report_['data_quality_score'] = self._calculate_quality_score(X)

        return self

    def transform(self, X):
        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        X_cleaned = X.copy()

        # Remove duplicates
        if self.remove_duplicates and self.duplicate_count_ > 0:
            X_cleaned = X_cleaned.drop_duplicates()

        # Fix data types
        if self.dtype_fixes_:
            for col, dtype_info in self.dtype_fixes_.items():
                if col in X_cleaned.columns:
                    X_cleaned[col] = self._apply_dtype_fix(X_cleaned[col], dtype_info)

        # Drop problematic columns
        if self.columns_to_drop_:
            X_cleaned = X_cleaned.drop(columns=self.columns_to_drop_, errors='ignore')

        return X_cleaned

    def _analyze_data_types(self, X):
        """Analyze and suggest data type fixes."""
        dtype_fixes = {}

        for col in X.columns:
            series = X[col]

            # Skip if already numeric
            if pd.api.types.is_numeric_dtype(series):
                continue

            # Check if string column can be converted to numeric
            if series.dtype == 'object':
                # Try to convert to numeric
                numeric_series = pd.to_numeric(series, errors='coerce')
                non_null_original = series.notna().sum()
                non_null_converted = numeric_series.notna().sum()

                # If we can convert most values (>80%), suggest numeric conversion
                conversion_rate = non_null_converted / non_null_original if non_null_original > 0 else 0
                if conversion_rate > 0.8:
                    dtype_fixes[col] = {
                        'original_dtype': str(series.dtype),
                        'suggested_dtype': 'numeric',
                        'conversion_rate': conversion_rate,
                        'fix_method': 'to_numeric'
                    }
                # Check if it's a datetime
                elif self._is_datetime_column(series):
                    dtype_fixes[col] = {
                        'original_dtype': str(series.dtype),
                        'suggested_dtype': 'datetime',
                        'fix_method': 'to_datetime'
                    }

        return dtype_fixes

    def _is_datetime_column(self, series):
        """Check if a column contains datetime-like strings."""
        sample_size = min(100, len(series))
        sample = series.dropna().head(sample_size)

        datetime_count = 0
        for val in sample:
            try:
                pd.to_datetime(val)
                datetime_count += 1
            except:
                continue

        # If >50% of sample values can be parsed as datetime
        return datetime_count / len(sample) > 0.5 if len(sample) > 0 else False

    def _apply_dtype_fix(self, series, dtype_info):
        """Apply data type fix to a series."""
        try:
            if dtype_info['fix_method'] == 'to_numeric':
                return pd.to_numeric(series, errors='coerce')
            elif dtype_info['fix_method'] == 'to_datetime':
                return pd.to_datetime(series, errors='coerce')
        except:
            # If conversion fails, return original
            pass

        return series

    def _identify_constant_features(self, X):
        """Identify columns with little variance."""
        constant_columns = []

        for col in X.columns:
            if pd.api.types.is_numeric_dtype(X[col]):
                # For numeric columns, check if values are nearly constant
                unique_ratio = X[col].nunique() / len(X[col])
                if unique_ratio < (1 - self.constant_threshold):
                    constant_columns.append(col)
            else:
                # For categorical columns, check if one value dominates
                if len(X[col]) > 0:
                    value_counts = X[col].value_counts()
                    if len(value_counts) > 0:
                        max_frequency = value_counts.iloc[0] / len(X[col])
                        if max_frequency >= self.constant_threshold:
                            constant_columns.append(col)

        return constant_columns

    def _identify_high_missing_columns(self, X):
        """Identify columns with high missing value rates."""
        high_missing_columns = []

        for col in X.columns:
            missing_rate = X[col].isnull().sum() / len(X[col])
            if missing_rate >= self.missing_threshold:
                high_missing_columns.append(col)

        return high_missing_columns

    def _calculate_quality_score(self, X):
        """Calculate overall data quality score (0-1)."""
        total_cells = X.shape[0] * X.shape[1]
        missing_cells = X.isnull().sum().sum()
        duplicate_rows = X.duplicated().sum()

        # Basic quality metrics
        missing_penalty = (missing_cells / total_cells) * 0.4  # 40% weight for missing values
        duplicate_penalty = (duplicate_rows / X.shape[0]) * 0.2  # 20% weight for duplicates
        constant_penalty = len(self.columns_to_drop_) / X.shape[1] * 0.2  # 20% weight for constant features

        # Data type consistency (remaining 20%)
        dtype_issues = len(self.dtype_fixes_)
        dtype_penalty = min(dtype_issues / X.shape[1], 1.0) * 0.2

        quality_score = 1.0 - (missing_penalty + duplicate_penalty + constant_penalty + dtype_penalty)
        return max(0.0, min(1.0, quality_score))

    def get_validation_report(self):
        """Get detailed validation report."""
        return self.validation_report_.copy()

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
                 missing_strategy: str = 'median',
                 scaling_strategy: str = 'standard',
                 handle_outliers: bool = True,
                 outlier_method: str = 'iqr',
                 categorical_encoding: str = 'onehot',
                 enable_feature_engineering: bool = False,
                 create_polynomial: bool = False,
                 polynomial_degree: int = 2,
                 create_interactions: bool = False,
                 create_binning: bool = False,
                 enable_validation: bool = True,
                 remove_duplicates: bool = True,
                 fix_data_types: bool = True,
                 remove_constant_features: bool = True,
                 remove_high_missing: bool = True):
        
        self.target_column = target_column
        self.task_type = task_type
        self.max_cardinality = max_cardinality or DEFAULT_CONFIG['max_cardinality']
        self.drop_id_columns = drop_id_columns
        self.handle_missing = handle_missing
        self.missing_strategy = missing_strategy
        self.scaling_strategy = scaling_strategy
        self.handle_outliers = handle_outliers
        self.outlier_method = outlier_method
        self.categorical_encoding = categorical_encoding
        self.enable_feature_engineering = enable_feature_engineering
        self.create_polynomial = create_polynomial
        self.polynomial_degree = polynomial_degree
        self.create_interactions = create_interactions
        self.create_binning = create_binning
        self.enable_validation = enable_validation
        self.remove_duplicates = remove_duplicates
        self.fix_data_types = fix_data_types
        self.remove_constant_features = remove_constant_features
        self.remove_high_missing = remove_high_missing

        # Will be set during fit
        self.pipeline = None
        self.feature_names_out = None
        self.dropped_columns = []
        self.label_encoder = None
        self.outlier_handler = None
        self.feature_engineer = None
        self.data_validator = None
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

            # Apply data validation and cleaning first (if enabled)
            if self.enable_validation:
                self.data_validator = DataValidator(
                    remove_duplicates=self.remove_duplicates,
                    fix_data_types=self.fix_data_types,
                    remove_constant_features=self.remove_constant_features,
                    remove_high_missing=self.remove_high_missing
                )
                self.data_validator.fit(X, y)
                X = self.data_validator.transform(X)

                # Convert back to DataFrame if needed
                if not isinstance(X, pd.DataFrame):
                    X = pd.DataFrame(X)

            # Identify columns to drop
            self.dropped_columns = self._identify_columns_to_drop(X)

            # Remove dropped columns
            X_clean = X.drop(columns=self.dropped_columns, errors='ignore')

            # Apply feature engineering before separation (if enabled)
            if self.enable_feature_engineering:
                self.feature_engineer = FeatureEngineer(
                    create_polynomial=self.create_polynomial,
                    polynomial_degree=self.polynomial_degree,
                    create_interactions=self.create_interactions,
                    create_binning=self.create_binning
                )
                self.feature_engineer.fit(X_clean, y)
                X_clean = self.feature_engineer.transform(X_clean)

                # Convert back to DataFrame if needed
                if not isinstance(X_clean, pd.DataFrame):
                    X_clean = pd.DataFrame(X_clean, columns=self.feature_engineer.get_feature_names_out())

            # Separate column types (after feature engineering)
            # Re-check column types to ensure they're correctly classified after validation
            numeric_columns, categorical_columns = self._separate_column_types(X_clean)

            # Double-check and clean numeric columns - convert strings to numeric where possible
            truly_numeric = []
            for col in numeric_columns:
                try:
                    # Check if already numeric dtype - keep as is
                    if pd.api.types.is_numeric_dtype(X_clean[col]):
                        truly_numeric.append(col)
                        continue

                    # Not numeric dtype, try to convert
                    # Test conversion on sample first
                    test_series = X_clean[col].dropna().head(100)
                    if len(test_series) > 0:
                        pd.to_numeric(test_series, errors='raise')

                    truly_numeric.append(col)
                except (ValueError, TypeError) as e:
                    # Move to categorical if conversion fails
                    sample_values = X_clean[col].dropna().head(5).tolist()
                    logger.warning(f"Column '{col}' detected as numeric type but contains non-numeric values: {sample_values}")
                    logger.warning(f"Column '{col}' will be treated as categorical. Error: {str(e)[:100]}")
                    categorical_columns.append(col)

            # Also check categorical columns - some might actually be numeric (object dtype with numeric values)
            truly_categorical = []
            for col in categorical_columns:
                # Try to convert to numeric
                converted = pd.to_numeric(X_clean[col], errors='coerce')
                non_null_original = X_clean[col].notna().sum()
                non_null_converted = converted.notna().sum()

                # If >80% of values convert successfully, treat as numeric
                conversion_rate = non_null_converted / non_null_original if non_null_original > 0 else 0
                if conversion_rate > 0.8:
                    logger.info(f"Column '{col}' detected as categorical but {conversion_rate:.1%} values are numeric. Converting to numeric.")
                    # Convert the column to numeric
                    X_clean[col] = converted
                    truly_numeric.append(col)
                else:
                    truly_categorical.append(col)

            numeric_columns = truly_numeric
            categorical_columns = truly_categorical

            logger.info(f"After validation: {len(numeric_columns)} numeric columns, {len(categorical_columns)} categorical columns")
            
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
            
            # Fit the pipeline using the cleaned/converted data
            # X_clean has all the type conversions applied
            if self.pipeline is not None:
                self.pipeline.fit(X_clean)
            
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

        # Apply data validation transformations (if enabled)
        if self.enable_validation and self.data_validator is not None:
            X_copy = self.data_validator.transform(X_copy)

            # Convert back to DataFrame if needed
            if not isinstance(X_copy, pd.DataFrame):
                # Get column names from the validator or use original columns
                col_names = [c for c in X.columns if c != self.target_column and c not in self.dropped_columns]
                X_copy = pd.DataFrame(X_copy, columns=col_names)

        # Apply the same type conversions that were done during fit
        # Convert categorical columns that should be numeric
        for col in X_copy.columns:
            # Try to convert to numeric if it's object dtype
            if X_copy[col].dtype == 'object':
                converted = pd.to_numeric(X_copy[col], errors='coerce')
                # Check if conversion is successful for most values
                non_null_count = X_copy[col].notna().sum()
                if non_null_count > 0 and converted.notna().sum() / non_null_count > 0.8:
                    X_copy[col] = converted

        # Apply feature engineering first (if enabled)
        if self.enable_feature_engineering and self.feature_engineer is not None:
            X_copy = self.feature_engineer.transform(X_copy)

            # Convert back to DataFrame if needed
            if not isinstance(X_copy, pd.DataFrame):
                X_copy = pd.DataFrame(X_copy, columns=self.feature_engineer.get_feature_names_out())

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
                try:
                    if self.missing_strategy == 'median':
                        numeric_steps.append(('imputer', SimpleImputer(strategy='median')))
                    elif self.missing_strategy == 'mean':
                        numeric_steps.append(('imputer', SimpleImputer(strategy='mean')))
                    elif self.missing_strategy == 'mode':
                        numeric_steps.append(('imputer', SimpleImputer(strategy='most_frequent')))
                    elif self.missing_strategy == 'knn':
                        numeric_steps.append(('imputer', KNNImputer(n_neighbors=5)))
                    elif self.missing_strategy == 'iterative':
                        numeric_steps.append(('imputer', IterativeImputer(random_state=42, max_iter=10)))
                    else:
                        # Default to median
                        numeric_steps.append(('imputer', SimpleImputer(strategy='median')))
                except Exception as e:
                    logger.error(f"Error setting up imputer with strategy '{self.missing_strategy}': {e}")
                    logger.info(f"Numeric columns: {numeric_columns}")
                    raise ValueError(f"Cannot use {self.missing_strategy} strategy. Ensure all columns are properly typed. Error: {e}")

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

            # Choose encoding strategy
            if self.categorical_encoding == 'onehot':
                categorical_steps.append(
                    ('onehot', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'))
                )
            elif self.categorical_encoding == 'target':
                # Target encoding requires y during fit - will be handled separately
                categorical_steps.append(
                    ('target', TargetEncoder(smoothing=1.0))
                )
            elif self.categorical_encoding == 'ordinal':
                categorical_steps.append(
                    ('ordinal', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1))
                )
            elif self.categorical_encoding == 'frequency':
                categorical_steps.append(
                    ('frequency', FrequencyEncoder())
                )
            else:
                # Default to one-hot
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

        # Add categorical feature names based on encoding strategy
        for col in categorical_columns:
            if self.categorical_encoding == 'onehot':
                # Get unique categories (excluding NaN)
                categories = sorted(X[col].dropna().astype(str).unique())
                # OneHotEncoder drops the first category, so we start from index 1
                for cat in categories[1:]:
                    feature_names.append(f"{col}_{cat}")
            elif self.categorical_encoding in ['target', 'ordinal', 'frequency']:
                # These encodings keep the original column name
                feature_names.append(col)
            else:
                # Default case (one-hot)
                categories = sorted(X[col].dropna().astype(str).unique())
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
                'numeric': f'{self.missing_strategy} imputation' if self.handle_missing else 'none',
                'categorical': 'constant imputation (_missing_)' if self.handle_missing else 'none'
            },
            'data_validation': {
                'enabled': self.enable_validation,
                'remove_duplicates': self.remove_duplicates,
                'fix_data_types': self.fix_data_types,
                'remove_constant_features': self.remove_constant_features,
                'remove_high_missing': self.remove_high_missing,
                'validation_report': self.data_validator.get_validation_report() if self.data_validator else None
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
                'categorical': f'{self.categorical_encoding} encoding (max cardinality: {self.max_cardinality})'
            },
            'feature_engineering': {
                'enabled': self.enable_feature_engineering,
                'polynomial_features': self.create_polynomial,
                'polynomial_degree': self.polynomial_degree if self.create_polynomial else None,
                'interaction_features': self.create_interactions,
                'binning_features': self.create_binning
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
