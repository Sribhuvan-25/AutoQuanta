"""
Model training framework for AutoQuanta.
Supports RandomForest, LightGBM, and XGBoost with hyperparameter optimization.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, Union
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import StratifiedKFold, KFold, cross_val_score, RandomizedSearchCV
from sklearn.metrics import (
    accuracy_score, roc_auc_score, f1_score, precision_score, recall_score,
    mean_squared_error, mean_absolute_error, r2_score
)
import lightgbm as lgb
import xgboost as xgb
import logging
import time
from dataclasses import dataclass

try:
    from .utils import (
        ModelResult, 
        TrainingConfig, 
        Timer,
        DEFAULT_MODEL_PARAMS,
        detect_task_type
    )
    from .preprocessor import AutoPreprocessor
except ImportError:
    from utils import (
        ModelResult, 
        TrainingConfig, 
        Timer,
        DEFAULT_MODEL_PARAMS,
        detect_task_type
    )
    from preprocessor import AutoPreprocessor

logger = logging.getLogger(__name__)


@dataclass
class TrainingResults:
    """Complete results from model training."""
    best_model: ModelResult
    all_results: List[ModelResult]
    training_config: TrainingConfig
    preprocessing_report: Dict[str, Any]
    feature_names: List[str]
    training_summary: Dict[str, Any]


class ModelTrainer:
    """
    Main training engine.
    Handles model training, evaluation, and selection.
    """
    
    def __init__(self, random_state: int = 42, n_jobs: int = -1):
        """
        Initialize the model trainer.
        
        Args:
            random_state: Random seed for reproducibility
            n_jobs: Number of parallel jobs (-1 for all cores)
        """
        self.random_state = random_state
        self.n_jobs = n_jobs
    
    def train(self, 
              X: np.ndarray, 
              y: np.ndarray,
              config: TrainingConfig,
              feature_names: Optional[List[str]] = None) -> TrainingResults:
        
        with Timer("Model training"):
            logger.info(f"Starting training with {len(X)} samples, {X.shape[1]} features")
            logger.info(f"Task type: {config.task_type}")
            logger.info(f"Models to try: {config.models_to_try}")
            
            # Set up cross-validation
            cv = self._setup_cross_validation(y, config)
            
            # Train all models
            all_results = []
            for model_name in config.models_to_try:
                logger.info(f"Training {model_name.upper()}...")
                
                model_result = self._train_single_model(
                    model_name, X, y, config, cv, feature_names
                )
                all_results.append(model_result)
                
                logger.info(f"  {model_name.upper()} CV Score: {model_result.mean_score:.4f} ± {model_result.std_score:.4f}")
            
            # Select best model
            best_model = self._select_best_model(all_results, config.task_type)
            logger.info(f"Best model: {best_model.model_name} (Score: {best_model.mean_score:.4f})")
            
            # Create training summary
            training_summary = self._create_training_summary(all_results, best_model, config)
            
            return TrainingResults(
                best_model=best_model,
                all_results=all_results,
                training_config=config,
                preprocessing_report={},  # Will be filled by caller
                feature_names=feature_names or [],
                training_summary=training_summary
            )
    
    def train_from_dataframe(self,
                           df: pd.DataFrame,
                           target_column: str,
                           task_type: Optional[str] = None,
                           models_to_try: Optional[List[str]] = None,
                           **kwargs) -> TrainingResults:
        # Create training config
        config = TrainingConfig(
            target_column=target_column,
            task_type=task_type or detect_task_type(df[target_column]),
            models_to_try=models_to_try or ['rf', 'lgbm', 'xgb'],
            **kwargs
        )
        
        # Preprocess data
        preprocessor = AutoPreprocessor(target_column=target_column, task_type=config.task_type)
        X, y = preprocessor.fit_transform(df)
        
        # Train models
        results = self.train(X, y, config, preprocessor.get_feature_names_out())
        
        # Add preprocessing report
        results.preprocessing_report = preprocessor.get_preprocessing_report()
        
        return results
    
    def _setup_cross_validation(self, y: np.ndarray, config: TrainingConfig):
        if config.task_type == 'classification':
            return StratifiedKFold(
                n_splits=config.cv_folds, 
                shuffle=True, 
                random_state=self.random_state
            )
        else:
            return KFold(
                n_splits=config.cv_folds, 
                shuffle=True, 
                random_state=self.random_state
            )
    
    def _train_single_model(self,
                          model_name: str,
                          X: np.ndarray,
                          y: np.ndarray,
                          config: TrainingConfig,
                          cv,
                          feature_names: Optional[List[str]] = None) -> ModelResult:
        
        start_time = time.time()
        
        # Get model and parameter grid
        model_class = self._get_model_class(model_name, config.task_type)
        param_grid = self._get_param_grid(model_name)
        
        # Create base model
        base_model = model_class(random_state=self.random_state, n_jobs=self.n_jobs)
        
        # Perform randomized search
        search = RandomizedSearchCV(
            base_model,
            param_grid,
            n_iter=10,  # Number of parameter combinations to try
            cv=cv,
            scoring=self._get_scoring_metric(config.task_type),
            n_jobs=self.n_jobs,
            random_state=self.random_state,
            verbose=0
        )
        
        # Fit the search
        search.fit(X, y)
        
        # Get best model and scores
        best_model = search.best_estimator_
        cv_scores = cross_val_score(
            best_model, X, y, cv=cv, 
            scoring=self._get_scoring_metric(config.task_type),
            n_jobs=self.n_jobs
        )
        
        # Calculate feature importance
        feature_importance = self._calculate_feature_importance(
            best_model, feature_names
        )
        
        training_time = time.time() - start_time
        
        return ModelResult(
            model_name=model_name,
            model_object=best_model,
            cv_scores=cv_scores.tolist(),
            mean_score=cv_scores.mean(),
            std_score=cv_scores.std(),
            feature_importance=feature_importance,
            training_time=training_time,
            best_params=search.best_params_
        )
    
    def _get_model_class(self, model_name: str, task_type: str):
        
        if model_name == 'rf':
            return RandomForestClassifier if task_type == 'classification' else RandomForestRegressor
        
        elif model_name == 'lgbm':
            return lgb.LGBMClassifier if task_type == 'classification' else lgb.LGBMRegressor
        
        elif model_name == 'xgb':
            return xgb.XGBClassifier if task_type == 'classification' else xgb.XGBRegressor
        
        else:
            raise ValueError(f"Unknown model: {model_name}")
    
    def _get_param_grid(self, model_name: str) -> Dict[str, List[Any]]:
        return DEFAULT_MODEL_PARAMS.get(model_name, {})
    
    def _get_scoring_metric(self, task_type: str) -> str:
        if task_type == 'classification':
            return 'roc_auc'  # Will fallback to accuracy for multiclass
        else:
            return 'neg_mean_squared_error'
    
    def _calculate_feature_importance(self, 
                                    model, 
                                    feature_names: Optional[List[str]] = None) -> Optional[Dict[str, float]]:
        
        if not hasattr(model, 'feature_importances_'):
            return None
        
        importances = model.feature_importances_
        
        if feature_names and len(feature_names) == len(importances):
            return dict(zip(feature_names, importances.tolist()))
        else:
            return {f"feature_{i}": imp for i, imp in enumerate(importances.tolist())}
    
    def _select_best_model(self, results: List[ModelResult], task_type: str) -> ModelResult:
        
        # For regression, we use negative MSE, so higher (less negative) is better
        # For classification, higher is always better
        return max(results, key=lambda x: x.mean_score)
    
    def _create_training_summary(self, 
                               all_results: List[ModelResult],
                               best_model: ModelResult,
                               config: TrainingConfig) -> Dict[str, Any]:
        
        total_training_time = sum(result.training_time for result in all_results)
        
        model_scores = {
            result.model_name: {
                'mean_score': result.mean_score,
                'std_score': result.std_score,
                'training_time': result.training_time
            }
            for result in all_results
        }
        
        return {
            'total_training_time': total_training_time,
            'best_model_name': best_model.model_name,
            'best_score': best_model.mean_score,
            'models_trained': len(all_results),
            'task_type': config.task_type,
            'cv_folds': config.cv_folds,
            'model_scores': model_scores,
            'feature_count': len(best_model.feature_importance) if best_model.feature_importance else 0
        }


class ModelEvaluator:
    
    def __init__(self):
        pass
    
    def evaluate_model(self, 
                      model, 
                      X_test: np.ndarray, 
                      y_test: np.ndarray,
                      task_type: str) -> Dict[str, float]:
        """
        Evaluate a model on test data.
        
        Args:
            model: Trained model
            X_test: Test features
            y_test: Test labels
            task_type: 'classification' or 'regression'
            
        Returns:
            Dictionary of evaluation metrics
        """
        
        if task_type == 'classification':
            return self._evaluate_classification(model, X_test, y_test)
        else:
            return self._evaluate_regression(model, X_test, y_test)
    
    def _evaluate_classification(self, model, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        
        y_pred = model.predict(X_test)
        
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'f1_score': f1_score(y_test, y_pred, average='weighted'),
            'precision': precision_score(y_test, y_pred, average='weighted'),
            'recall': recall_score(y_test, y_pred, average='weighted')
        }
        
        # Add ROC AUC for binary classification
        if len(np.unique(y_test)) == 2:
            if hasattr(model, 'predict_proba'):
                y_proba = model.predict_proba(X_test)[:, 1]
                metrics['roc_auc'] = roc_auc_score(y_test, y_proba)
        
        return metrics
    
    def _evaluate_regression(self, model, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        
        y_pred = model.predict(X_test)
        
        return {
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mae': mean_absolute_error(y_test, y_pred),
            'r2_score': r2_score(y_test, y_pred)
        }


# Convenience functions
def train_models(df: pd.DataFrame,
                target_column: str,
                task_type: Optional[str] = None,
                models_to_try: Optional[List[str]] = None,
                **kwargs) -> TrainingResults:

    trainer = ModelTrainer()
    return trainer.train_from_dataframe(
        df=df,
        target_column=target_column,
        task_type=task_type,
        models_to_try=models_to_try,
        **kwargs
    )


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray, task_type: str) -> Dict[str, float]:
    evaluator = ModelEvaluator()
    return evaluator.evaluate_model(model, X_test, y_test, task_type)
