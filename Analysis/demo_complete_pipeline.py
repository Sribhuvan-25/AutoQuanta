"""
Complete AutoQuanta ML Pipeline Demo
Demonstrates the full workflow: CSV → EDA → Train → Export → Predict
"""

import pandas as pd
import numpy as np
from pathlib import Path
import tempfile
import logging
import sys

# Add the Analysis directory to the path
sys.path.insert(0, str(Path(__file__).parent))

# Set up logging
logging.basicConfig(level=logging.INFO)

def create_demo_datasets():
    """Create demo datasets for testing the complete pipeline."""
    np.random.seed(42)
    
    # Create training dataset
    n_train = 2000
    
    # Features
    data = {
        'customer_id': range(1, n_train + 1),  # ID column (should be dropped)
        'age': np.random.randint(18, 80, n_train),
        'income': np.random.normal(55000, 20000, n_train),
        'credit_score': np.random.randint(300, 850, n_train),
        'years_employed': np.random.randint(0, 40, n_train),
        'education': np.random.choice(['High School', 'Bachelor', 'Master', 'PhD'], n_train, p=[0.4, 0.35, 0.2, 0.05]),
        'city_size': np.random.choice(['Small', 'Medium', 'Large'], n_train, p=[0.3, 0.5, 0.2]),
        'has_car': np.random.choice([0, 1], n_train, p=[0.3, 0.7]),
        'constant_col': ['same_value'] * n_train,  # Constant column (should be dropped)
    }
    
    # Create target (loan approval) - make it correlated with features
    loan_prob = (
        (data['age'] - 40) / 200 +
        (data['income'] - 55000) / 100000 +
        (data['credit_score'] - 500) / 500 +
        data['years_employed'] / 100 +
        np.where(data['has_car'], 0.1, -0.1) +
        np.random.normal(0, 0.2, n_train)
    )
    data['loan_approved'] = (loan_prob > 0).astype(int)
    
    # Convert to DataFrame first
    train_df = pd.DataFrame(data)
    
    # Add some missing values
    missing_indices = np.random.choice(n_train, size=int(n_train * 0.05), replace=False)
    for i, idx in enumerate(missing_indices):
        if i % 3 == 0:
            train_df.loc[idx, 'income'] = np.nan
        elif i % 3 == 1:
            train_df.loc[idx, 'education'] = None
        else:
            train_df.loc[idx, 'years_employed'] = np.nan
    
    # Create test dataset (different distribution)
    n_test = 500
    test_data = {
        'customer_id': range(n_train + 1, n_train + n_test + 1),
        'age': np.random.randint(20, 75, n_test),
        'income': np.random.normal(60000, 25000, n_test),
        'credit_score': np.random.randint(350, 800, n_test),
        'years_employed': np.random.randint(0, 35, n_test),
        'education': np.random.choice(['High School', 'Bachelor', 'Master', 'PhD'], n_test, p=[0.35, 0.4, 0.2, 0.05]),
        'city_size': np.random.choice(['Small', 'Medium', 'Large'], n_test, p=[0.25, 0.45, 0.3]),
        'has_car': np.random.choice([0, 1], n_test, p=[0.25, 0.75]),
        'constant_col': ['same_value'] * n_test,
    }
    
    test_df = pd.DataFrame(test_data)
    
    return train_df, test_df


def demo_complete_pipeline():
    """Run the complete ML pipeline demo."""
    print("🚀 AutoQuanta Complete ML Pipeline Demo")
    print("=" * 50)
    
    # Create demo data
    print("\n📊 Creating demo datasets...")
    train_df, test_df = create_demo_datasets()
    print(f"Training data: {train_df.shape[0]} rows × {train_df.shape[1]} columns")
    print(f"Test data: {test_df.shape[0]} rows × {test_df.shape[1]} columns")
    
    # Save to temporary files
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        train_csv = temp_path / "train_data.csv"
        test_csv = temp_path / "test_data.csv"
        
        train_df.to_csv(train_csv, index=False)
        test_df.to_csv(test_csv, index=False)
        
        print(f"Saved datasets to: {temp_path}")
        
        # Step 1: Data Loading and Profiling
        print("\n🔍 Step 1: Data Loading and Profiling")
        print("-" * 40)
        
        from loader import DataLoader
        from profiler import DataProfiler, print_profile_summary
        
        loader = DataLoader()
        df = loader.load_csv(train_csv)
        
        profiler = DataProfiler()
        profile = profiler.profile_csv(train_csv)
        
        print_profile_summary(profile)
        
        # Get recommendations
        recommendations = profiler.get_column_recommendations(profile, target_column='loan_approved')
        print("📝 Preprocessing Recommendations:")
        for category, recs in recommendations.items():
            if recs:
                print(f"  {category.replace('_', ' ').title()}:")
                for rec in recs:
                    print(f"    • {rec}")
        
        # Step 2: Model Training
        print("\n🤖 Step 2: Model Training")
        print("-" * 40)
        
        from trainer import train_models
        
        # Train models
        results = train_models(
            df=train_df,
            target_column='loan_approved',
            task_type='classification',
            models_to_try=['rf', 'lgbm', 'xgb'],
            cv_folds=5
        )
        
        print(f"Best model: {results.best_model.model_name}")
        print(f"Best CV score: {results.best_model.mean_score:.4f} ± {results.best_model.std_score:.4f}")
        print(f"Training time: {results.best_model.training_time:.2f} seconds")
        
        print("\nAll model results:")
        for result in results.all_results:
            print(f"  {result.model_name.upper()}: {result.mean_score:.4f} ± {result.std_score:.4f}")
        
        # Show feature importance
        if results.best_model.feature_importance:
            print("\n🎯 Top 5 Feature Importances:")
            sorted_features = sorted(
                results.best_model.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )
            for feature, importance in sorted_features[:5]:
                print(f"  {feature}: {importance:.4f}")
        
        # Step 3: ONNX Export
        print("\n📦 Step 3: ONNX Model Export")
        print("-" * 40)
        
        from exporter import ONNXExporter
        
        try:
            exporter = ONNXExporter()
            
            # Get sample data for export
            from preprocessor import AutoPreprocessor
            preprocessor = AutoPreprocessor(target_column='loan_approved', task_type='classification')
            X_sample, _ = preprocessor.fit_transform(train_df.head(10))
            
            # Export to ONNX
            model_dir = temp_path / "models"
            export_result = exporter.export_training_results(
                results=results,
                output_dir=model_dir,
                X_sample=X_sample
            )
            
            if export_result['success']:
                print(f"✅ Model exported successfully!")
                print(f"Model path: {export_result['output_path']}")
                print(f"Model size: {export_result['model_size_mb']:.2f} MB")
                print(f"Validation: {'✅ Passed' if export_result['validation']['success'] else '❌ Failed'}")
            else:
                print(f"❌ Export failed: {export_result['error']}")
                return
                
        except ImportError as e:
            print(f"⚠️  ONNX libraries not available: {e}")
            print("Install with: pip install onnx skl2onnx onnxruntime")
            print("Skipping ONNX export and inference steps...")
            return
        
        # Step 4: Inference
        print("\n🔮 Step 4: Model Inference")
        print("-" * 40)
        
        from exporter import ONNXInferenceEngine
        
        # Load the exported model
        model_path = model_dir / "best_model.onnx"
        inference_engine = ONNXInferenceEngine(model_path)
        
        print(f"Model info: {inference_engine.get_model_info()}")
        
        # Prepare test data (same preprocessing as training)
        preprocessor_test = AutoPreprocessor(target_column='loan_approved', task_type='classification')
        # Fit on training data, transform test data
        preprocessor_test.fit(train_df.drop(columns=['loan_approved']), train_df['loan_approved'])
        X_test = preprocessor_test.transform(test_df)
        
        # Run inference
        predictions = inference_engine.predict(X_test)
        
        print(f"✅ Inference completed!")
        print(f"Predictions shape: {predictions.shape}")
        print(f"Sample predictions: {predictions[:10]}")
        
        # Create predictions DataFrame
        test_with_predictions = test_df.copy()
        test_with_predictions['predicted_loan_approved'] = predictions
        
        predictions_csv = temp_path / "predictions.csv"
        test_with_predictions.to_csv(predictions_csv, index=False)
        print(f"Predictions saved to: {predictions_csv}")
        
        # Step 5: Summary
        print("\n📊 Step 5: Pipeline Summary")
        print("-" * 40)
        
        print(f"✅ Dataset: {train_df.shape[0]} training samples, {test_df.shape[0]} test samples")
        print(f"✅ Features: {len(results.feature_names)} after preprocessing")
        print(f"✅ Best Model: {results.best_model.model_name} (Score: {results.best_model.mean_score:.4f})")
        print(f"✅ Export: ONNX model ({export_result['model_size_mb']:.2f} MB)")
        print(f"✅ Inference: {len(predictions)} predictions generated")
        
        print(f"\nFiles created in {temp_path}:")
        for file_path in temp_path.rglob("*"):
            if file_path.is_file():
                size_mb = file_path.stat().st_size / (1024 * 1024)
                print(f"  📄 {file_path.relative_to(temp_path)} ({size_mb:.2f} MB)")
        
        print("\n🎉 Complete pipeline demo finished successfully!")
        
        # Keep the temp directory for inspection
        input("Press Enter to clean up temporary files...")


if __name__ == "__main__":
    demo_complete_pipeline()
