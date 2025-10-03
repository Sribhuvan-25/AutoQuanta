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
import time
from pathlib import Path
from typing import Dict, Any, List
import traceback

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
import uvicorn
import asyncio
from collections import defaultdict
import uuid

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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for training sessions and their event queues
training_sessions: Dict[str, Dict[str, Any]] = {}
training_event_queues: Dict[str, asyncio.Queue] = defaultdict(asyncio.Queue)

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

@app.get("/training/stream/{session_id}")
async def training_stream(session_id: str, request: Request):
    """
    Server-Sent Events endpoint for real-time training updates
    """
    async def event_generator():
        queue = training_event_queues[session_id]

        try:
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'session_id': session_id, 'timestamp': time.time()})}\n\n"

            while True:
                # Check if client is still connected
                if await request.is_disconnected():
                    logger.info(f"Client disconnected from training stream {session_id}")
                    break

                try:
                    # Wait for events with timeout
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)

                    # Send event to client
                    yield f"data: {json.dumps(event)}\n\n"

                    # If training is complete or error, close the stream
                    if event.get('type') in ['complete', 'error']:
                        break

                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield f"data: {json.dumps({'type': 'ping', 'timestamp': time.time()})}\n\n"

        except Exception as e:
            logger.error(f"Error in training stream {session_id}: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e), 'timestamp': time.time()})}\n\n"
        finally:
            # Cleanup
            if session_id in training_event_queues:
                del training_event_queues[session_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

async def emit_training_event(session_id: str, event_type: str, data: Any):
    """Helper function to emit training events to SSE stream"""
    if session_id in training_event_queues:
        event = {
            'type': event_type,
            'data': data,
            'timestamp': time.time()
        }
        await training_event_queues[session_id].put(event)

@app.post("/train_async")
async def train_model_async(
    csv_file: UploadFile = File(...),
    config: str = Form(default="{}")
):
    """
    Start async training with SSE streaming support
    Returns session_id for monitoring via /training/stream/{session_id}
    """
    try:
        # Generate session ID
        session_id = str(uuid.uuid4())

        # Parse config
        try:
            config_dict = json.loads(config)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid config JSON: {e}")

        # Read CSV content
        csv_content = await csv_file.read()
        csv_text = csv_content.decode('utf-8')

        # Create temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_csv:
            temp_csv.write(csv_text)
            temp_csv_path = temp_csv.name

        # Store session info
        training_sessions[session_id] = {
            'status': 'starting',
            'config': config_dict,
            'csv_path': temp_csv_path,
            'started_at': time.time()
        }

        # Start training in background
        asyncio.create_task(run_training_with_streaming(session_id, temp_csv_path, config_dict))

        return {
            'success': True,
            'session_id': session_id,
            'message': 'Training started. Connect to /training/stream/{session_id} for updates'
        }

    except Exception as e:
        logger.error(f"Failed to start training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def run_training_with_streaming(session_id: str, csv_path: str, config: dict):
    """Run training in background and emit SSE events"""
    try:
        await emit_training_event(session_id, 'status', {'status': 'starting', 'message': 'Initializing training...'})

        train_api_path = project_root / 'Analysis' / 'train_api.py'

        cmd = [
            sys.executable,
            str(train_api_path),
            csv_path,
            json.dumps(config),
            '--session-id', session_id  # Pass session ID to training script
        ]

        # Run process and stream output
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(project_root)
        )

        training_sessions[session_id]['status'] = 'running'
        await emit_training_event(session_id, 'status', {'status': 'running', 'message': 'Training in progress...'})

        # Read stdout line by line
        while True:
            line = await process.stdout.readline()
            if not line:
                break

            line_text = line.decode('utf-8').strip()

            # Parse progress messages
            if line_text.startswith('PROGRESS:'):
                try:
                    progress_data = json.loads(line_text[9:])
                    await emit_training_event(session_id, 'progress', progress_data)
                except json.JSONDecodeError:
                    pass
            elif line_text.startswith('METRIC:'):
                try:
                    metric_data = json.loads(line_text[7:])
                    await emit_training_event(session_id, 'metric', metric_data)
                except json.JSONDecodeError:
                    pass
            elif line_text.startswith('LOG:'):
                try:
                    log_data = json.loads(line_text[4:])
                    await emit_training_event(session_id, 'log', log_data)
                except json.JSONDecodeError:
                    pass
            elif line_text and not line_text.startswith('[LightGBM]'):
                # Regular log message
                await emit_training_event(session_id, 'log', {
                    'level': 'info',
                    'message': line_text,
                    'timestamp': time.time()
                })

        # Wait for process to complete
        await process.wait()

        # Clean up temp file
        if os.path.exists(csv_path):
            os.unlink(csv_path)

        if process.returncode == 0:
            # Read stderr to get final JSON result
            stderr = await process.stderr.read()
            stderr_text = stderr.decode('utf-8')

            # Try to extract JSON result from output
            try:
                # The final result should be in stderr or we need to parse it differently
                training_sessions[session_id]['status'] = 'completed'
                await emit_training_event(session_id, 'complete', {
                    'message': 'Training completed successfully',
                    'session_id': session_id
                })
            except Exception as e:
                logger.error(f"Failed to parse training result: {e}")
                await emit_training_event(session_id, 'error', {'error': str(e)})
        else:
            stderr = await process.stderr.read()
            error_msg = stderr.decode('utf-8')
            training_sessions[session_id]['status'] = 'error'
            await emit_training_event(session_id, 'error', {'error': error_msg})

    except Exception as e:
        logger.error(f"Training error for session {session_id}: {e}")
        training_sessions[session_id]['status'] = 'error'
        await emit_training_event(session_id, 'error', {'error': str(e)})

@app.post("/train")
async def train_model(
    csv_file: UploadFile = File(...),
    config: str = Form(default="{}")
):
    """
    Train ML model using the actual train_api.py script (synchronous, original behavior)
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
                    output = result.stdout.strip()
                    
                    # Split by lines and find where the JSON ends and logging begins
                    lines = output.split('\n')
                    
                    # Find the start and end of the JSON object
                    json_start = -1
                    json_end = -1
                    brace_count = 0
                    in_json = False
                    
                    for i, line in enumerate(lines):
                        # Skip PROGRESS and LightGBM messages
                        if line.startswith('PROGRESS:') or line.startswith('[LightGBM]'):
                            continue
                            
                        # Look for JSON start
                        if not in_json and line.strip().startswith('{'):
                            json_start = i
                            in_json = True
                            brace_count = line.count('{') - line.count('}')
                        elif in_json:
                            brace_count += line.count('{') - line.count('}')
                            if brace_count == 0:  # JSON is complete
                                json_end = i
                                break
                    
                    if json_start == -1 or json_end == -1:
                        raise ValueError("No complete JSON object found in output")
                    
                    # Extract and parse the JSON portion only
                    json_lines = []
                    for i in range(json_start, json_end + 1):
                        line = lines[i]
                        if not line.startswith('PROGRESS:') and not line.startswith('[LightGBM]'):
                            json_lines.append(line)
                    
                    json_str = '\n'.join(json_lines)
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

@app.post("/download_model")
async def download_model(request: dict):
    """Download a trained model as ZIP file"""
    try:
        from fastapi.responses import FileResponse
        import zipfile
        
        model_path = request.get('model_path')
        if not model_path:
            raise HTTPException(status_code=400, detail="model_path is required")
        
        model_dir = Path(model_path)
        if not model_dir.exists():
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Create ZIP file
        zip_path = f"/tmp/{model_dir.name}.zip"
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for file_path in model_dir.rglob('*'):
                if file_path.is_file():
                    zipf.write(file_path, file_path.relative_to(model_dir))
        
        return FileResponse(zip_path, filename=f"{model_dir.name}.zip")
        
    except Exception as e:
        logger.error(f"Model download failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delete_model")
async def delete_model(request: dict):
    """Delete a trained model and its files"""
    try:
        model_path = request.get('model_path')
        if not model_path:
            raise HTTPException(status_code=400, detail="model_path is required")
        
        model_dir = Path(model_path)
        if model_dir.exists() and model_dir.is_dir():
            import shutil
            shutil.rmtree(model_dir)
            return {"success": True, "message": f"Model {model_path} deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Model not found")
            
    except Exception as e:
        logger.error(f"Model deletion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects")
async def create_project(project_data: dict):
    """Create a new project"""
    try:
        project_name = project_data.get('name', '').strip()
        if not project_name:
            raise HTTPException(status_code=400, detail="Project name is required")
        
        # Create project directory
        projects_dir = Path("projects")
        projects_dir.mkdir(exist_ok=True)
        
        project_id = project_name.lower().replace(' ', '_').replace('-', '_')
        project_dir = projects_dir / project_id
        
        if project_dir.exists():
            raise HTTPException(status_code=400, detail="Project already exists")
            
        project_dir.mkdir()
        
        # Create project metadata
        metadata = {
            'id': project_id,
            'name': project_name,
            'description': project_data.get('description', ''),
            'created_at': time.time(),
            'updated_at': time.time(),
            'files': [],
            'models': [],
            'status': 'active'
        }
        
        metadata_path = project_dir / 'project.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        return {"success": True, "project": metadata}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Project creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects")
async def list_projects():
    """List all projects"""
    try:
        projects_dir = Path("projects")
        if not projects_dir.exists():
            return {"success": True, "projects": []}
            
        projects = []
        for project_dir in projects_dir.iterdir():
            if project_dir.is_dir():
                metadata_path = project_dir / 'project.json'
                if metadata_path.exists():
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                        projects.append(metadata)
                        
        # Sort by creation date (newest first)
        projects.sort(key=lambda x: x.get('created_at', 0), reverse=True)
        
        return {"success": True, "projects": projects}
        
    except Exception as e:
        logger.error(f"Project listing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    try:
        project_dir = Path("projects") / project_id
        if not project_dir.exists():
            raise HTTPException(status_code=404, detail="Project not found")
            
        import shutil
        shutil.rmtree(project_dir)
        
        return {"success": True, "message": f"Project {project_id} deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Project deletion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/add_model")
async def add_model_to_project(project_id: str, request: dict):
    """Add a trained model to a project"""
    try:
        project_dir = Path("projects") / project_id
        metadata_path = project_dir / 'project.json'
        
        if not metadata_path.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Read existing metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        model_path = request.get('model_path')
        model_name = request.get('model_name', model_path)
        
        # Add model to project
        if 'models' not in metadata:
            metadata['models'] = []
            
        model_entry = {
            'name': model_name,
            'path': model_path,
            'added_at': time.time()
        }
        metadata['models'].append(model_entry)
        metadata['updated_at'] = time.time()
        
        # Save updated metadata
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return {"success": True, "message": "Model added to project"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add model to project failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/profile_simple")
async def profile_simple(csv_file: UploadFile = File(...)):
    """Simple CSV profiling for v1"""
    try:
        logger.info("Received simple profiling request")
        
        csv_content = await csv_file.read()
        csv_str = csv_content.decode('utf-8')
        
        from io import StringIO
        df = pd.read_csv(StringIO(csv_str))
        
        # Basic profile
        columns = []
        for col in df.columns:
            col_info = {
                'name': col,
                'dtype': str(df[col].dtype),
                'non_null_count': int(df[col].count()),
                'null_count': int(df[col].isnull().sum()),
                'unique_count': int(df[col].nunique()),
                'data_type': 'numeric' if pd.api.types.is_numeric_dtype(df[col]) else 'categorical'
            }
            
            if col_info['data_type'] == 'numeric':
                col_info.update({
                    'mean': float(df[col].mean()) if not pd.isna(df[col].mean()) else 0,
                    'std': float(df[col].std()) if not pd.isna(df[col].std()) else 0,
                    'min': float(df[col].min()) if not pd.isna(df[col].min()) else 0,
                    'max': float(df[col].max()) if not pd.isna(df[col].max()) else 0
                })
            
            columns.append(col_info)
        
        # Convert DataFrame to string[][] format for frontend
        data_rows = []
        for _, row in df.iterrows():
            data_rows.append([str(val) for val in row.values])
        
        return {
            'success': True,
            'basic_info': {
                'rows': int(len(df)),
                'columns': int(len(df.columns))
            },
            'columns': columns,
            'warnings': [],
            'data': data_rows,
            'headers': list(df.columns)
        }
        
    except Exception as e:
        logger.error(f"Simple profiling failed: {e}")
        return {'success': False, 'error': str(e), 'columns': []}

@app.post("/profile")
async def profile_data(csv_file: UploadFile = File(...)):
    """
    Profile CSV data - simplified version for v1
    """
    try:
        logger.info("Received data profiling request")
        
        # Read CSV content
        csv_content = await csv_file.read()
        csv_str = csv_content.decode('utf-8')
        
        # Simple pandas-based profiling
        from io import StringIO
        
        df = pd.read_csv(StringIO(csv_str))
        
        # Basic profile info
        profile = {
            'success': True,
            'basic_info': {
                'rows': int(len(df)),
                'columns': int(len(df.columns)),
                'memory_usage_mb': float(df.memory_usage(deep=True).sum() / (1024 * 1024))
            },
            'columns': [],
            'warnings': []
        }
        
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