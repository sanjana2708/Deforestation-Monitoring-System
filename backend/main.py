from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import tempfile
from pathlib import Path

# Import our custom modules
# We import authenticate_gee to ensure it's available for context-checking
from core.gee_engine import analyze_area, authenticate_gee
from core.cnn_model import classify_patch
from core.timelapse_gee import get_timelapse_gif_url
from core import cnn_dataset

app = FastAPI(title="Himalayan Forest Monitor API")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Your Vite frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models (Defined before the endpoints) ---
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

@app.post("/analyze")
async def get_forest_analysis(request: AnalysisRequest):
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
async def run_classifier(request: ClassificationRequest):
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
async def classify_upload(file: UploadFile = File(...)):
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
async def timelapse_url(request: TimelapseRequest):
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
async def cnn_dataset_items(limit: int = 40, refresh: bool = False):
    """List classified samples from data/cnn_dataset_raw (newest first)."""
    try:
        lim = max(1, min(100, limit))
        items, aggregate = cnn_dataset.get_items(limit=lim, refresh=refresh)
        return {"success": True, "items": items, "aggregate": aggregate}
    except Exception as e:
        print(f"🚨 CNN Dataset Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cnn-dataset/file/{filename}")
async def cnn_dataset_file(filename: str):
    """Serve a single image from cnn_dataset_raw (basename only, no traversal)."""
    path = cnn_dataset.resolve_safe_file_path(filename)
    if path is None:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path,
        media_type=cnn_dataset.guess_media_type(filename),
        filename=filename,
    )