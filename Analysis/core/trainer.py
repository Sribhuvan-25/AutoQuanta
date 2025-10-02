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
    mean_squared_error, mean_absolute_error, r2_score, confusion_matrix, roc_curve
)
from sklearn.inspection import permutation_importance
import lightgbm as lgb
import xgboost as xgb
import logging
import time
from dataclasses import dataclass

from ..utils import (
    ModelTrainingResult, 
    FoldResult,
    TrainingResults,
    TrainingConfig, 
    Timer,
    DEFAULT_MODEL_PARAMS,
    detect_task_type
)
from .preprocessor import AutoPreprocessor

logger = logging.getLogger(__name__)


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
            
            # Generate visualization data
            cv_summary = self._generate_cv_summary(all_results)
            model_comparison = self._generate_model_comparison(all_results)
            prediction_analysis = self._generate_prediction_analysis(all_results, config.task_type)
            
            return TrainingResults(
                best_model=best_model,
                all_models=all_results,
                training_config=config,
                data_profile=None,  # Will be filled by caller
                cv_summary=cv_summary,
                model_comparison=model_comparison,
                prediction_analysis=prediction_analysis
            )
    
    def train_from_dataframe(self,
                           df: pd.DataFrame,
                           target_column: str,
                           task_type: Optional[str] = None,
                           models_to_try: Optional[List[str]] = None,
                           preprocessing_config: Optional[Dict[str, Any]] = None,
                           **kwargs) -> TrainingResults:
        # Create training config
        config = TrainingConfig(
            target_column=target_column,
            task_type=task_type or detect_task_type(df[target_column]),
            models_to_try=models_to_try or ['rf', 'lgbm', 'xgb'],
            **kwargs
        )

        # Profile data
        from .profiler import DataProfiler
        profiler = DataProfiler()
        data_profile = profiler.profile_dataframe(df)

        # Preprocess data with custom configuration if provided
        if preprocessing_config:
            preprocessor = AutoPreprocessor(
                target_column=target_column,
                task_type=config.task_type,
                **preprocessing_config
            )
        else:
            preprocessor = AutoPreprocessor(
                target_column=target_column,
                task_type=config.task_type
            )

        X, y = preprocessor.fit_transform(df)

        # Train models
        results = self.train(X, y, config, preprocessor.get_feature_names_out())

        # Add data profile and preprocessing report to results
        results.data_profile = data_profile
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
                          feature_names: Optional[List[str]] = None) -> ModelTrainingResult:
        
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
        
        # Get detailed fold information with comprehensive metrics
        fold_results = []
        all_predictions = []
        all_actuals = []
        all_probabilities = []
        
        for fold_idx, (train_idx, val_idx) in enumerate(cv.split(X, y)):
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            
            # Train model on this fold
            fold_model = model_class(**search.best_params_, random_state=self.random_state)
            fold_model.fit(X_train, y_train)
            
            # Get predictions
            val_predictions = fold_model.predict(X_val)
            val_probabilities = None
            if config.task_type == 'classification' and hasattr(fold_model, 'predict_proba'):
                proba_matrix = fold_model.predict_proba(X_val)
                # Handle both binary and multiclass cases
                if proba_matrix.shape[1] >= 2:
                    val_probabilities = proba_matrix[:, 1]  # Probability of positive class
                else:
                    val_probabilities = proba_matrix[:, 0]  # Single class case
            
            # Calculate comprehensive metrics
            if config.task_type == 'classification':
                from sklearn.metrics import f1_score, precision_score, recall_score, accuracy_score
                val_score = f1_score(y_val, val_predictions, average='weighted')
                train_predictions = fold_model.predict(X_train)
                train_score = f1_score(y_train, train_predictions, average='weighted')
            else:
                val_score = r2_score(y_val, val_predictions)
                train_predictions = fold_model.predict(X_train)
                train_score = r2_score(y_train, train_predictions)
            
            # Store fold results
            fold_result = FoldResult(
                fold_idx=fold_idx,
                train_indices=train_idx.tolist(),
                val_indices=val_idx.tolist(),
                train_score=train_score,
                val_score=val_score,
                val_predictions=val_predictions,
                val_probabilities=val_probabilities,
                val_actual=y_val
            )
            fold_results.append(fold_result)
            
            # Collect all predictions for aggregated analysis
            all_predictions.extend(val_predictions)
            all_actuals.extend(y_val)
            if val_probabilities is not None:
                all_probabilities.extend(val_probabilities)
        
        # Calculate feature importance
        feature_importance = self._calculate_feature_importance(
            best_model, X, y, feature_names, config.task_type
        )
        
        # Calculate comprehensive metrics
        comprehensive_metrics = self._calculate_comprehensive_metrics(
            np.array(all_predictions), 
            np.array(all_actuals), 
            config.task_type,
            np.array(all_probabilities) if all_probabilities else None
        )
        
        training_time = time.time() - start_time
        
        return ModelTrainingResult(
            model_name=model_name,
            model_object=best_model,
            cv_scores=cv_scores.tolist(),
            mean_score=cv_scores.mean(),
            std_score=cv_scores.std(),
            fold_results=fold_results,
            feature_importance=feature_importance,
            training_time=training_time,
            best_params=search.best_params_,
            all_predictions=np.array(all_predictions),
            all_actuals=np.array(all_actuals),
            all_probabilities=np.array(all_probabilities) if all_probabilities else None,
            comprehensive_metrics=comprehensive_metrics
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
            return 'f1_weighted'
        else:
            return 'r2'
    
    def _calculate_comprehensive_metrics(self,
                                       predictions: np.ndarray,
                                       actuals: np.ndarray,
                                       task_type: str,
                                       probabilities: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """Calculate comprehensive metrics for model evaluation."""

        if task_type == 'classification':
            metrics = {
                'accuracy': accuracy_score(actuals, predictions),
                'f1_score': f1_score(actuals, predictions, average='weighted'),
                'precision': precision_score(actuals, predictions, average='weighted'),
                'recall': recall_score(actuals, predictions, average='weighted')
            }

            # Add confusion matrix
            cm = confusion_matrix(actuals, predictions)
            metrics['confusion_matrix'] = cm.tolist()

            # Add class labels
            unique_labels = np.unique(actuals)
            metrics['class_labels'] = [str(label) for label in unique_labels]

            # Add ROC AUC and ROC curve for binary classification
            if len(np.unique(actuals)) == 2 and probabilities is not None:
                metrics['roc_auc'] = roc_auc_score(actuals, probabilities)

                # Calculate ROC curve
                fpr, tpr, thresholds = roc_curve(actuals, probabilities)
                metrics['roc_curve'] = {
                    'fpr': fpr.tolist(),
                    'tpr': tpr.tolist(),
                    'thresholds': thresholds.tolist(),
                    'auc': metrics['roc_auc']
                }

        else:  # regression
            mse = mean_squared_error(actuals, predictions)
            metrics = {
                'mse': mse,
                'rmse': np.sqrt(mse),
                'mae': mean_absolute_error(actuals, predictions),
                'r2_score': r2_score(actuals, predictions)
            }

        return metrics
    
    def _calculate_feature_importance(self,
                                    model,
                                    X: np.ndarray,
                                    y: np.ndarray,
                                    feature_names: Optional[List[str]] = None,
                                    task_type: str = 'classification') -> Optional[Dict[str, float]]:
        """
        Calculate feature importance using native importance or permutation importance fallback.
        """

        # Try native feature importance first
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_

            if feature_names and len(feature_names) == len(importances):
                return dict(zip(feature_names, importances.tolist()))
            else:
                return {f"feature_{i}": imp for i, imp in enumerate(importances.tolist())}

        # Fallback to permutation importance
        logger.info(f"Model doesn't have native feature_importances_, using permutation importance...")
        try:
            # Use a sample of data for faster computation if dataset is large
            sample_size = min(1000, len(X))
            if len(X) > sample_size:
                sample_indices = np.random.choice(len(X), sample_size, replace=False)
                X_sample = X[sample_indices]
                y_sample = y[sample_indices]
            else:
                X_sample = X
                y_sample = y

            # Calculate permutation importance
            scoring = 'f1_weighted' if task_type == 'classification' else 'r2'
            perm_importance = permutation_importance(
                model, X_sample, y_sample,
                n_repeats=10,
                random_state=42,
                scoring=scoring,
                n_jobs=self.n_jobs
            )

            importances = perm_importance.importances_mean

            if feature_names and len(feature_names) == len(importances):
                return dict(zip(feature_names, importances.tolist()))
            else:
                return {f"feature_{i}": imp for i, imp in enumerate(importances.tolist())}

        except Exception as e:
            logger.warning(f"Failed to calculate permutation importance: {e}")
            return None
    
    def _select_best_model(self, results: List[ModelTrainingResult], task_type: str) -> ModelTrainingResult:
        
        return max(results, key=lambda x: x.mean_score)
    
    def _create_training_summary(self, 
                               all_results: List[ModelTrainingResult],
                               best_model: ModelTrainingResult,
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
    
    def _generate_cv_summary(self, all_results: List[ModelTrainingResult]) -> Dict[str, Any]:
        """Generate cross-validation summary data for visualization."""
        cv_data = {}
        
        for result in all_results:
            model_name = result.model_name
            cv_data[model_name] = {
                'fold_scores': [fold.val_score for fold in result.fold_results],
                'mean_score': result.mean_score,
                'std_score': result.std_score,
                'fold_details': [
                    {
                        'fold_idx': fold.fold_idx,
                        'train_score': fold.train_score,
                        'val_score': fold.val_score,
                        'train_size': len(fold.train_indices),
                        'val_size': len(fold.val_indices)
                    }
                    for fold in result.fold_results
                ]
            }
        
        return cv_data
    
    def _generate_model_comparison(self, all_results: List[ModelTrainingResult]) -> Dict[str, Any]:
        """Generate model comparison data for visualization."""
        comparison_data = {
            'model_names': [result.model_name for result in all_results],
            'mean_scores': [result.mean_score for result in all_results],
            'std_scores': [result.std_score for result in all_results],
            'training_times': [result.training_time for result in all_results],
            'feature_importance': {}
        }
        
        # Add feature importance data
        for result in all_results:
            if result.feature_importance:
                comparison_data['feature_importance'][result.model_name] = result.feature_importance
        
        return comparison_data
    
    def _generate_prediction_analysis(self, all_results: List[ModelTrainingResult], task_type: str) -> Dict[str, Any]:
        """Generate prediction vs actual analysis data for visualization."""
        analysis_data = {}
        
        for result in all_results:
            model_name = result.model_name
            analysis_data[model_name] = {
                'predictions': result.all_predictions.tolist(),
                'actuals': result.all_actuals.tolist(),
                'residuals': (result.all_actuals - result.all_predictions).tolist()
            }
            
            # Add probabilities for classification
            if task_type == 'classification' and result.all_probabilities is not None:
                analysis_data[model_name]['probabilities'] = result.all_probabilities.tolist()
        
        return analysis_data


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
