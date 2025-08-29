#!/usr/bin/env python3
"""
AutoQuanta FastAPI HTTP Server
Provides HTTP endpoints for the frontend to call the actual Python ML training and prediction APIs
"""

import os
import sys
import json
import tempfile
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, List
import traceback

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import uvicorn

# Add the project root to the path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AutoQuanta ML API",
    description="FastAPI server for AutoQuanta machine learning training and prediction",
    version="1.0.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class HealthResponse(BaseModel):
    status: str
    message: str
    python_version: str
    working_directory: str

class TrainingResponse(BaseModel):
    success: bool
    message: str = None
    error: str = None
    results: Dict[str, Any] = None

class ModelsResponse(BaseModel):
    success: bool
    models: List[Dict[str, Any]] = []
    error: str = None

class PredictionRequest(BaseModel):
    model_path: str
    values: List[float]

class PredictionResponse(BaseModel):
    success: bool
    prediction: float = None
    error: str = None

class DataProfileResponse(BaseModel):
    success: bool
    profile: Dict[str, Any] = None
    error: str = None

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="AutoQuanta FastAPI Server is running",
        python_version=sys.version,
        working_directory=str(project_root)
    )

@app.post("/train")
async def train_model(
    csv_file: UploadFile = File(...),
    config: str = Form(default="{}")
):
    """
    Train ML model using the actual train_api.py script
    """
    try:
        logger.info("Received training request")
        
        # Parse config
        try:
            config_dict = json.loads(config)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid config JSON: {e}")
        
        logger.info(f"Training config: {config_dict}")
        
        # Read CSV content
        csv_content = await csv_file.read()
        csv_text = csv_content.decode('utf-8')
        
        # Create temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_csv:
            temp_csv.write(csv_text)
            temp_csv_path = temp_csv.name
        
        logger.info(f"Created temporary CSV file: {temp_csv_path}")
        
        try:
            # Call the actual train_api.py script
            train_api_path = project_root / 'Analysis' / 'train_api.py'
            
            if not train_api_path.exists():
                raise FileNotFoundError(f"train_api.py not found at {train_api_path}")
            
            # Execute the Python training script
            cmd = [
                sys.executable,  # Use the same Python interpreter
                str(train_api_path),
                temp_csv_path,
                json.dumps(config_dict)
            ]
            
            logger.info(f"Executing command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                cwd=str(project_root)
            )
            
            # Clean up temporary file
            os.unlink(temp_csv_path)
            
            if result.returncode == 0:
                # Parse the JSON output from train_api.py
                # Filter out PROGRESS messages and extract the final JSON result
                try:
                    lines = result.stdout.strip().split('\n')
                    json_lines = []
                    
                    # Find lines that don't start with PROGRESS:
                    in_json = False
                    json_content = []
                    
                    for line in lines:
                        if line.startswith('PROGRESS:'):
                            continue  # Skip progress messages
                        elif line.strip().startswith('{'):
                            in_json = True
                            json_content.append(line)
                        elif in_json:
                            json_content.append(line)
                    
                    if not json_content:
                        raise ValueError("No JSON result found in output")
                    
                    # Join the JSON lines and parse
                    json_str = '\n'.join(json_content)
                    training_result = json.loads(json_str)
                    
                    logger.info(f"Training completed successfully: {training_result.get('message', 'No message')}")
                    return TrainingResponse(
                        success=True,
                        message=training_result.get('message'),
                        results=training_result
                    )
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Failed to parse training result: {e}")
                    logger.error(f"Raw output: {result.stdout}")
                    raise HTTPException(
                        status_code=500, 
                        detail={
                            'error': f'Failed to parse training result: {e}',
                            'raw_output': result.stdout,
                            'stderr': result.stderr
                        }
                    )
            else:
                logger.error(f"Training script failed with return code {result.returncode}")
                logger.error(f"stderr: {result.stderr}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        'error': f'Training failed: {result.stderr}',
                        'return_code': result.returncode,
                        'stdout': result.stdout
                    }
                )
                
        except subprocess.TimeoutExpired:
            # Clean up temporary file on timeout
            if os.path.exists(temp_csv_path):
                os.unlink(temp_csv_path)
            raise HTTPException(
                status_code=500,
                detail={'error': 'Training timeout (exceeded 5 minutes)'}
            )
        except Exception as e:
            # Clean up temporary file on error
            if os.path.exists(temp_csv_path):
                os.unlink(temp_csv_path)
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training request failed: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={
                'error': str(e),
                'traceback': traceback.format_exc()
            }
        )

@app.get("/models", response_model=ModelsResponse)
async def list_models():
    """
    List available models using the actual predict_api.py script
    """
    try:
        logger.info("Received model list request")
        
        # Call the actual predict_api.py script
        predict_api_path = project_root / 'Analysis' / 'predict_api.py'
        
        if not predict_api_path.exists():
            raise FileNotFoundError(f"predict_api.py not found at {predict_api_path}")
        
        cmd = [
            sys.executable,
            str(predict_api_path),
            'list_models'
        ]
        
        logger.info(f"Executing command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,  # 30 second timeout
            cwd=str(project_root)
        )
        
        if result.returncode == 0:
            try:
                models_result = json.loads(result.stdout)
                logger.info(f"Found {len(models_result.get('models', []))} models")
                return ModelsResponse(
                    success=True,
                    models=models_result.get('models', [])
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse models result: {e}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        'error': f'Failed to parse models result: {e}',
                        'raw_output': result.stdout
                    }
                )
        else:
            logger.error(f"Model listing failed with return code {result.returncode}")
            raise HTTPException(
                status_code=500,
                detail={
                    'error': f'Model listing failed: {result.stderr}',
                    'return_code': result.returncode
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model listing request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail={'error': str(e)}
        )

@app.post("/predict")
async def predict(
    csv_data: UploadFile = File(...),
    model_path: str = Form(...),
    use_onnx: str = Form(default="true")
):
    """
    Make predictions using the actual predict_api.py script
    """
    try:
        logger.info("Received prediction request")
        
        # Read CSV data
        csv_content = await csv_data.read()
        csv_text = csv_content.decode('utf-8')
        
        use_onnx_bool = use_onnx.lower() == 'true'
        
        # Call the actual predict_api.py script
        predict_api_path = project_root / 'Analysis' / 'predict_api.py'
        
        if not predict_api_path.exists():
            raise FileNotFoundError(f"predict_api.py not found at {predict_api_path}")
        
        cmd = [
            sys.executable,
            str(predict_api_path),
            'predict',
            model_path,
            csv_text,
            'true' if use_onnx_bool else 'false'
        ]
        
        logger.info(f"Executing prediction command for model: {model_path}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,  # 2 minute timeout
            cwd=str(project_root)
        )
        
        if result.returncode == 0:
            try:
                prediction_result = json.loads(result.stdout)
                logger.info(f"Prediction completed: {prediction_result.get('message', 'No message')}")
                return prediction_result
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse prediction result: {e}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        'error': f'Failed to parse prediction result: {e}',
                        'raw_output': result.stdout
                    }
                )
        else:
            logger.error(f"Prediction failed with return code {result.returncode}")
            raise HTTPException(
                status_code=500,
                detail={
                    'error': f'Prediction failed: {result.stderr}',
                    'return_code': result.returncode
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail={'error': str(e)}
        )

@app.post("/predict_single", response_model=PredictionResponse)
async def predict_single(request: PredictionRequest):
    """
    Make single value prediction using the actual predict_api.py script
    """
    try:
        logger.info("Received single prediction request")
        
        # Call the actual predict_api.py script
        predict_api_path = project_root / 'Analysis' / 'predict_api.py'
        
        if not predict_api_path.exists():
            raise FileNotFoundError(f"predict_api.py not found at {predict_api_path}")
        
        cmd = [
            sys.executable,
            str(predict_api_path),
            'predict_single',
            request.model_path,
            json.dumps(request.values)
        ]
        
        logger.info(f"Executing single prediction for model: {request.model_path}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,  # 30 second timeout
            cwd=str(project_root)
        )
        
        if result.returncode == 0:
            try:
                prediction_result = json.loads(result.stdout)
                logger.info(f"Single prediction completed: {prediction_result.get('prediction', 'No result')}")
                return PredictionResponse(
                    success=True,
                    prediction=prediction_result.get('prediction')
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse single prediction result: {e}")
                raise HTTPException(
                    status_code=500,
                    detail={
                        'error': f'Failed to parse prediction result: {e}',
                        'raw_output': result.stdout
                    }
                )
        else:
            logger.error(f"Single prediction failed with return code {result.returncode}")
            raise HTTPException(
                status_code=500,
                detail={
                    'error': f'Single prediction failed: {result.stderr}',
                    'return_code': result.returncode
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Single prediction request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail={'error': str(e)}
        )

@app.post("/profile", response_model=DataProfileResponse)
async def profile_data(csv_file: UploadFile = File(...)):
    """
    Profile CSV data using the Analysis/core/profiler.py
    """
    try:
        logger.info("Received data profiling request")
        
        # Read CSV content
        csv_content = await csv_file.read()
        csv_text = csv_content.decode('utf-8')
        
        # Create temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_csv:
            temp_csv.write(csv_text)
            temp_csv_path = temp_csv.name
        
        logger.info(f"Created temporary CSV file for profiling: {temp_csv_path}")
        
        try:
            # Import and use the Analysis profiler
            analysis_path = str(project_root / 'Analysis')
            if analysis_path not in sys.path:
                sys.path.insert(0, analysis_path)
            
            # Clear any cached imports to ensure fresh import
            import importlib
            if 'Analysis.core.profiler' in sys.modules:
                importlib.reload(sys.modules['Analysis.core.profiler'])
            if 'Analysis.utils.data_structures' in sys.modules:
                importlib.reload(sys.modules['Analysis.utils.data_structures'])
                
            from Analysis.core.profiler import DataProfiler
            
            # Profile the data
            profiler = DataProfiler()
            profile = profiler.profile_csv(temp_csv_path)
            
            # Convert profile to dictionary for JSON response
            profile_dict = {
                'file_path': profile.file_path,
                'shape': profile.shape,
                'memory_usage_mb': profile.memory_usage_mb,
                'columns': [
                    {
                        'name': col.name,
                        'dtype': col.dtype,
                        'missing_count': col.missing_count,
                        'missing_percentage': col.missing_percentage,
                        'unique_count': col.unique_count,
                        'unique_percentage': col.unique_percentage,
                        'memory_usage': col.memory_usage,
                        'stats': col.stats,
                        'warnings': col.warnings
                    }
                    for col in profile.columns
                ],
                'missing_summary': profile.missing_summary,
                'dtypes_summary': profile.dtypes_summary,
                'warnings': profile.warnings
            }
            
            # Generate visualization data
            viz_data = profiler.generate_visualization_data(profile)
            profile_dict['visualization_data'] = viz_data
            
            # Generate recommendations
            recommendations = profiler.get_column_recommendations(profile)
            profile_dict['recommendations'] = recommendations
            
            # Clean up temporary file
            os.unlink(temp_csv_path)
            
            logger.info(f"Data profiling completed: {profile.shape[0]} rows, {profile.shape[1]} columns")
            return DataProfileResponse(
                success=True,
                profile=profile_dict
            )
            
        except Exception as e:
            # Clean up temporary file on error
            if os.path.exists(temp_csv_path):
                os.unlink(temp_csv_path)
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Data profiling request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail={'error': str(e)}
        )

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = ['fastapi', 'uvicorn', 'python-multipart', 'pandas', 'numpy', 'scikit-learn']
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'python-multipart':
                __import__('multipart')
            elif package == 'scikit-learn':
                __import__('sklearn')
            else:
                __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    return missing_packages

def check_api_scripts():
    """Check if required API scripts exist"""
    analysis_dir = project_root / 'Analysis'
    if not analysis_dir.exists():
        return f"Analysis directory not found at {analysis_dir}"
    
    train_api = analysis_dir / 'train_api.py'
    predict_api = analysis_dir / 'predict_api.py'
    
    if not train_api.exists():
        return f"train_api.py not found at {train_api}"
    
    if not predict_api.exists():
        return f"predict_api.py not found at {predict_api}"
    
    return None

if __name__ == "__main__":
    print("🚀 Starting AutoQuanta FastAPI Server...")
    print(f"📁 Project root: {project_root}")
    
    # Check dependencies
    missing_packages = check_dependencies()
    if missing_packages:
        print("❌ Missing required packages:", missing_packages)
        print("📦 Install with: pip install", ' '.join(missing_packages))
        sys.exit(1)
    
    # Check API scripts
    script_error = check_api_scripts()
    if script_error:
        print(f"❌ {script_error}")
        sys.exit(1)
    
    print("✅ All dependencies and scripts found")
    print(f"🔗 Server will be available at: http://localhost:8000")
    print("📊 API Documentation: http://localhost:8000/docs")
    print("📋 Endpoints:")
    print("  - GET  /health")
    print("  - POST /train")
    print("  - GET  /models")
    print("  - POST /predict")
    print("  - POST /predict_single")
    print("  - POST /profile")
    
    uvicorn.run(
        "fastapi_server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )