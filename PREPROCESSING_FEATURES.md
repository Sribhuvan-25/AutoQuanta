# AutoQuanta Preprocessing Pipeline - Complete Feature Set

## Overview
The AutoQuanta preprocessing pipeline now includes comprehensive data preparation capabilities with 7 major feature categories.

---

## ✅ **COMPLETED FEATURES**

### **1. Feature Scaling & Normalization**

**Purpose:** Transform numeric features to similar scales for algorithm compatibility

**Available Strategies:**
- **StandardScaler** (default): Z-score normalization (mean=0, std=1)
- **MinMaxScaler**: Scale to 0-1 range
- **RobustScaler**: Median-based scaling (resistant to outliers)
- **None**: No scaling applied

**Parameters:**
```python
scaling_strategy: str = 'standard'  # Options: 'standard', 'minmax', 'robust', 'none'
```

**Use Cases:**
- StandardScaler: Neural networks, SVM, KNN, linear models
- MinMaxScaler: When features need bounded ranges
- RobustScaler: Data with significant outliers
- None: Tree-based models (Random Forest, XGBoost)

---

### **2. Outlier Detection & Handling**

**Purpose:** Identify and handle extreme values that can skew model training

**Detection Methods:**
- **IQR (Interquartile Range)**: Q1 - 1.5×IQR to Q3 + 1.5×IQR
- **Z-Score**: Values beyond 3 standard deviations from mean

**Handling Strategies:**
- **Clip**: Cap outliers to boundary values (default)
- **Remove**: Mark as NaN for imputation
- **Transform**: Log transformation for positive skewed data

**Parameters:**
```python
handle_outliers: bool = True
outlier_method: str = 'iqr'  # Options: 'iqr', 'zscore'
```

**Features:**
- Per-column outlier statistics tracking
- Automatic threshold detection
- Preserves data distribution while limiting extremes

---

### **3. Advanced Categorical Encoding**

**Purpose:** Convert categorical variables to numeric representations

**Encoding Strategies:**

#### **OneHot Encoding** (default)
- Creates binary columns for each category
- Best for: Low cardinality features, tree-based models
- Drops first category to avoid multicollinearity

#### **Target Encoding**
- Encodes based on target variable mean per category
- Includes smoothing to prevent overfitting
- Best for: High cardinality features, any model type

#### **Ordinal Encoding**
- Maps categories to integers (0, 1, 2, ...)
- Best for: Naturally ordered categories, memory efficiency
- Handles unknown categories with special value (-1)

#### **Frequency Encoding**
- Encodes based on category frequency in training data
- Best for: When frequency indicates importance
- Preserves count information

**Parameters:**
```python
categorical_encoding: str = 'onehot'  # Options: 'onehot', 'target', 'ordinal', 'frequency'
```

---

### **4. Feature Engineering**

**Purpose:** Automatically create new features to capture complex relationships

**Feature Types:**

#### **Polynomial Features**
- Creates x², x³, and cross-product terms
- Captures non-linear relationships
- Configurable degree (default: 2)

Example: `[age, income]` → `[age, income, age², age×income, income²]`

#### **Interaction Terms**
- Multiplicative combinations of features
- Auto-selects promising pairs to prevent explosion
- Supports numeric×numeric and numeric×categorical

Example: `price × quantity`, `category_A × region_B`

#### **Feature Binning**
- Discretizes continuous features into categorical bins
- Strategies: quantile, uniform, kmeans
- Configurable number of bins (default: 5)

Example: `age` → `age_binned` (young, middle-aged, senior)

**Parameters:**
```python
enable_feature_engineering: bool = False
create_polynomial: bool = False
polynomial_degree: int = 2
create_interactions: bool = False
create_binning: bool = False
```

**Smart Features:**
- Automatic interaction selection (limits to top 10 pairs)
- Clear naming convention (poly_, _x_, _binned)
- Prevents feature explosion

---

### **5. Data Validation & Cleaning**

**Purpose:** Identify and fix data quality issues automatically

**Validation Checks:**

#### **Duplicate Detection**
- Identifies and removes duplicate rows
- Tracks count of duplicates removed

#### **Data Type Fixing**
- Auto-detects numeric strings and converts them
- Identifies datetime columns and parses them
- Conversion rate tracking (>80% threshold)

#### **Constant Feature Removal**
- Removes columns with >95% same values
- Separate handling for numeric and categorical
- Prevents low-variance features from entering model

#### **High Missing Value Removal**
- Removes columns with >80% missing values
- Configurable threshold
- Prevents sparse features

**Quality Scoring:**
- Calculates overall data quality score (0-1)
- Weighted by: missing values (40%), duplicates (20%), constant features (20%), type issues (20%)

**Parameters:**
```python
enable_validation: bool = True
remove_duplicates: bool = True
fix_data_types: bool = True
remove_constant_features: bool = True
remove_high_missing: bool = True
```

**Validation Report Includes:**
- Issues found with descriptions
- Fixes applied automatically
- Columns dropped with reasons
- Overall data quality score

---

### **6. Advanced Missing Value Strategies**

**Purpose:** Intelligently fill missing values using sophisticated algorithms

**Imputation Strategies:**

#### **Median Imputation** (default)
- Fills with column median
- Robust to outliers
- Fast and simple

#### **Mean Imputation**
- Fills with column mean
- Good for normally distributed data

#### **Mode Imputation**
- Fills with most frequent value
- Works for both numeric and categorical

#### **KNN Imputation**
- Uses K-Nearest Neighbors to estimate values
- Considers feature relationships
- More accurate but slower
- Default: 5 neighbors

#### **Iterative Imputation (MICE)**
- Models each feature with missing values as a function of others
- Multiple iterations for convergence
- Most sophisticated approach
- Default: 10 iterations

**Parameters:**
```python
handle_missing: bool = True
missing_strategy: str = 'median'  # Options: 'median', 'mean', 'mode', 'knn', 'iterative'
```

**For Categorical Variables:**
- Always uses constant imputation ('_missing_' value)
- Preserves missingness as information

---

### **7. Integration & Pipeline Architecture**

**Complete Pipeline Order:**
```
1. Data Validation & Cleaning
   ↓
2. Drop ID Columns
   ↓
3. Feature Engineering
   ↓
4. Separate Numeric/Categorical Columns
   ↓
5. Numeric Pipeline:
   - Outlier Handling
   - Missing Value Imputation
   - Feature Scaling
   ↓
6. Categorical Pipeline:
   - Missing Value Imputation
   - Categorical Encoding
   ↓
7. Combined Feature Matrix
   ↓
8. Target Variable Encoding
```

---

## **Usage Example**

```python
from Analysis.core.preprocessor import AutoPreprocessor

# Create preprocessor with all features enabled
preprocessor = AutoPreprocessor(
    target_column='price',
    task_type='regression',

    # Data Validation
    enable_validation=True,
    remove_duplicates=True,
    fix_data_types=True,
    remove_constant_features=True,
    remove_high_missing=True,

    # Missing Values
    handle_missing=True,
    missing_strategy='iterative',  # Advanced imputation

    # Outliers
    handle_outliers=True,
    outlier_method='iqr',

    # Scaling
    scaling_strategy='standard',

    # Categorical Encoding
    categorical_encoding='target',  # Target encoding for high cardinality
    max_cardinality=50,

    # Feature Engineering
    enable_feature_engineering=True,
    create_polynomial=True,
    polynomial_degree=2,
    create_interactions=True,
    create_binning=True
)

# Fit and transform
X_transformed, y_transformed = preprocessor.fit_transform(df)

# Get detailed report
report = preprocessor.get_preprocessing_report()
print(f"Original features: {report['original_features']}")
print(f"Final features: {report['final_features']}")
print(f"Data quality score: {report['data_validation']['validation_report']['data_quality_score']}")
```

---

## **Performance Considerations**

### **Fast Options (Production):**
- `missing_strategy='median'`
- `categorical_encoding='onehot'`
- `enable_feature_engineering=False`
- `outlier_method='iqr'`

### **Accurate Options (Research):**
- `missing_strategy='iterative'`
- `categorical_encoding='target'`
- `enable_feature_engineering=True`
- `outlier_method='zscore'`

### **Memory Efficient:**
- `categorical_encoding='ordinal'` or `'frequency'`
- `create_polynomial=False`
- `create_interactions=False`

---

## **Preprocessing Report Structure**

```python
{
    'target_column': 'price',
    'task_type': 'regression',
    'original_features': 15,
    'final_features': 42,
    'dropped_columns': ['id', 'constant_col'],
    'numeric_columns': ['age', 'income', 'score'],
    'categorical_columns': ['category', 'region'],

    'data_validation': {
        'enabled': True,
        'remove_duplicates': True,
        'validation_report': {
            'original_shape': (1000, 15),
            'issues_found': ['Found 5 duplicate rows', 'Found 2 constant features'],
            'fixes_applied': ['Duplicate rows removed', 'Constant features dropped'],
            'data_quality_score': 0.87
        }
    },

    'missing_value_strategy': {
        'numeric': 'iterative imputation',
        'categorical': 'constant imputation (_missing_)'
    },

    'outlier_handling': {
        'enabled': True,
        'method': 'iqr',
        'strategy': 'clip'
    },

    'scaling_strategy': {
        'numeric': 'standard'
    },

    'encoding_strategy': {
        'categorical': 'target encoding (max cardinality: 50)'
    },

    'feature_engineering': {
        'enabled': True,
        'polynomial_features': True,
        'polynomial_degree': 2,
        'interaction_features': True,
        'binning_features': True
    },

    'target_preprocessing': {
        'regression': 'float conversion'
    }
}
```

---

## **Key Benefits**

1. **Comprehensive**: Covers all major preprocessing needs
2. **Configurable**: 20+ parameters for fine-tuning
3. **Automatic**: Intelligent defaults and auto-detection
4. **Transparent**: Detailed reporting of all transformations
5. **sklearn Compatible**: Follows sklearn transformer interface
6. **Production Ready**: Efficient implementations with proper error handling
7. **Research Friendly**: Advanced options for experimentation

---

## **Next Steps for Users**

1. **Start Simple**: Use default parameters for initial experiments
2. **Analyze Reports**: Review preprocessing report to understand transformations
3. **Iterate**: Enable advanced features based on model performance
4. **Profile**: Use validation report to assess data quality
5. **Monitor**: Track feature counts and transformation effects

---

This preprocessing pipeline provides a solid foundation for building high-quality machine learning models with clean, well-prepared data.