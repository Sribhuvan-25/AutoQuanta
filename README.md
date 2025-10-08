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

### Option 1: Start both servers together (Recommended)
```bash
# First time setup
npm install              # Install concurrently
npm run install-all      # Install all dependencies (Python + Frontend)

# Start both servers
npm run dev              # Starts backend (port 8000) and frontend (port 3000)
```

### Option 2: Start servers separately
```bash
# Terminal 1 - Backend
python fastapi_server.py

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

Built with Next.js, Python/FastAPI, and scikit-learn. Completely local, completely yours.
