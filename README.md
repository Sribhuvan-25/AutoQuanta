# AutoQuanta

**Your local ML workbench. Load data, train models, make predictions — all on your machine.**

AutoQuanta is a desktop app that lets you work with machine learning without sending data anywhere. Drop in a CSV, pick your target column, and it'll train multiple models for you. No cloud, no subscriptions, just straightforward ML.

## What it does

- **Data profiling**: See what's in your dataset (missing values, distributions, correlations)
- **Auto training**: Tries different models (Random Forest, XGBoost, etc.) and picks the best one
- **Preprocessing**: Handle missing data, outliers, scaling, encoding — all configurable
- **Predictions**: Use trained models on new data (single values or batch CSV)
- **Project management**: Keep everything organized in local project folders

## Quick start

1. Install dependencies: `npm install` (frontend) and `pip install -r requirements.txt` (backend)
2. Start backend: `python Analysis/train_api.py`
3. Start frontend: `npm run dev`

Built with Next.js, Python/FastAPI, and scikit-learn. Completely local, completely yours.
