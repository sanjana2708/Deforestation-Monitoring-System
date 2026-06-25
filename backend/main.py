from fastapi import FastAPI, File, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import tempfile
from pathlib import Path

import asyncio

from fastapi.security import HTTPAuthorizationCredentials
from research.Scripts.generate_dataset import execute_harvest
# Import our custom modules
# We import authenticate_gee to ensure it's available for context-checking
from core.gee_engine import analyze_area, authenticate_gee
from core.cnn_model import classify_patch
from core.timelapse_gee import get_timelapse_gif_url
from core import cnn_dataset
from core.auth import get_current_user, security_scheme

app = FastAPI(title="Himalayan Forest Monitor API")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Your Vite frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Startup Event ---
@app.on_event("startup")
def startup_event():
    from core.auth import init_db
    init_db()

# --- Pydantic Models (Defined before the endpoints) ---
class UserAuthRequest(BaseModel):
    email: str
    password: str

class AnalysisRequest(BaseModel):
    lat: float
    lon: float
    start_date: str
    end_date: str

class ClassificationRequest(BaseModel):
    image_path: str


class TimelapseRequest(BaseModel):
    lat: float
    lon: float
    start_year: int = 2020
    end_year: int = 2024


ALLOWED_IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff'}

# --- Endpoints ---

@app.get("/")
async def root():
    return {"status": "Online", "message": "Himalayan Forest Monitoring System"}

@app.post("/auth/register")
async def register(request: UserAuthRequest):
    from core.auth import register_user, create_session
    email = request.email.strip().lower()
    password = request.password
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    success = register_user(email, password)
    if not success:
        raise HTTPException(status_code=400, detail="Email is already registered.")
    
    token = create_session(email)
    return {"success": True, "email": email, "token": token}

@app.post("/auth/login")
async def login(request: UserAuthRequest):
    from core.auth import authenticate_user, create_session
    email = request.email.strip().lower()
    password = request.password
    
    is_valid = authenticate_user(email, password)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    token = create_session(email)
    return {"success": True, "email": email, "token": token}

@app.post("/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    from core.auth import verify_session, delete_session
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    email = verify_session(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid session")
    delete_session(token)
    return {"success": True, "message": "Logged out successfully"}

@app.get("/auth/me")
async def get_me(email: str = Depends(get_current_user)):
    return {"success": True, "email": email}

@app.post("/analyze")
async def get_forest_analysis(request: AnalysisRequest, user_email: str = Depends(get_current_user)):
    """Fetches NDVI time-series from Google Earth Engine."""
    try:
        # Re-verify authentication within the request thread to prevent 
        # "Client library not initialized" errors.
        authenticate_gee() 

        data = analyze_area(
            request.lat, 
            request.lon, 
            request.start_date, 
            request.end_date
        )
        return {"success": True, "data": data}
    except Exception as e:
        print(f"🚨 GEE Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classify")
async def run_classifier(request: ClassificationRequest, user_email: str = Depends(get_current_user)):
    """Runs the MobileNetV2 model on a specific satellite patch."""
    # Ensure the path is absolute or relative to the backend root
    if not os.path.exists(request.image_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Image patch not found at: {request.image_path}"
        )
    
    try:
        # Predict using the CNN model
        result = classify_patch(request.image_path)
        return {"success": True, "prediction": result}
    except Exception as e:
        print(f"🚨 CNN Classification Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify-upload")
async def classify_upload(file: UploadFile = File(...), user_email: str = Depends(get_current_user)):
    """Accepts an image upload, runs the CNN classifier, and deletes the temp file."""
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_IMAGE_SUFFIXES:
        suffix = ".jpg"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            content = await file.read()
            if len(content) > 15 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="File too large (max 15MB)")
            tmp.write(content)

        result = classify_patch(tmp_path)
        return {"success": True, "prediction": result}
    except HTTPException:
        raise
    except Exception as e:
        print(f"🚨 CNN Upload Classification Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@app.post("/timelapse-url")
async def timelapse_url(request: TimelapseRequest, user_email: str = Depends(get_current_user)):
    """Returns a Google Earth Engine GIF thumbnail URL for the AOI (short-lived URL)."""
    try:
        if request.end_year < request.start_year:
            raise HTTPException(status_code=400, detail="end_year must be >= start_year")

        url = get_timelapse_gif_url(
            request.lat,
            request.lon,
            request.start_year,
            request.end_year,
        )
        if not url:
            raise HTTPException(
                status_code=404,
                detail="No Sentinel-2 frames for this location and year range.",
            )
        return {"success": True, "url": url, "format": "gif"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"🚨 Timelapse URL Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cnn-dataset/items")
async def cnn_dataset_items(limit: int = 40, refresh: bool = False, user_email: str = Depends(get_current_user)):
    """List classified samples from data/cnn_dataset_raw (newest first)."""
    try:
        lim = max(1, min(100, limit))
        items, aggregate = cnn_dataset.get_items(limit=lim, refresh=refresh)
        return {"success": True, "items": items, "aggregate": aggregate}
    except Exception as e:
        print(f"🚨 CNN Dataset Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cnn-dataset/file/{filename}")
async def cnn_dataset_file(filename: str, user_email: str = Depends(get_current_user)):
    """Serve a single image from cnn_dataset_raw (basename only, no traversal)."""
    path = cnn_dataset.resolve_safe_file_path(filename)
    if path is None:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path,
        media_type=cnn_dataset.guess_media_type(filename),
        filename=filename,
    )

# 1. Define the model
class HarvestRequest(BaseModel):
    lat: float
    lon: float
    start: str = "2020-01-01"
    end: str = "2024-12-01"

# 2. Update the endpoint to use the model
@app.post("/trigger-harvest")
async def trigger_harvest(
    request: HarvestRequest,
    user_email: str = Depends(get_current_user),
):
    """Run dataset harvest and return when analysis data is ready."""
    try:
        await asyncio.to_thread(
            execute_harvest,
            request.lat,
            request.lon,
            request.start,
            request.end,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"success": True, "message": "Harvest complete."}