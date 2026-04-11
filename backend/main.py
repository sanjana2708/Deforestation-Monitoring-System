from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

# Import our custom modules
# We import authenticate_gee to ensure it's available for context-checking
from core.gee_engine import analyze_area, authenticate_gee
from core.cnn_model import classify_patch

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