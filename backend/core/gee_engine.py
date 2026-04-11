import ee
import os
from dotenv import load_dotenv
from datetime import datetime
from dateutil.relativedelta import relativedelta
import concurrent.futures

load_dotenv()

def authenticate_gee():
    try:
        credentials = ee.ServiceAccountCredentials(
            os.getenv('GEE_SERVICE_ACCOUNT'),
            os.getenv('GEE_JSON_PATH')
        )
        ee.Initialize(credentials, project=os.getenv('GEE_PROJECT_ID'))
        return True
    except Exception as e:
        print(f"❌ GEE Auth Failed: {e}")
        return False

authenticate_gee()

def mask_s2_recovery(image):
    """Masks clouds and shadows using SCL band."""
    scl = image.select('SCL')
    # 4=Vegetation, 5=Bare Soils, 6=Water
    mask = scl.eq(4).Or(scl.eq(5)).Or(scl.eq(6))
    return image.updateMask(mask)

def add_ndvi(image):
    """Calculates NDVI. Scaling by 10000 is for S2_SR data."""
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands(ndvi)

def fetch_monthly_forest_signal(date_tuple):
    """Worker function to process a single month."""
    start_str, end_str, point = date_tuple
    try:
        # 1. Broaden the collection: S2_SR_HARMONIZED is best for post-2018.
        # If testing 2016, S2_HARMONIZED (L1C) would be required instead.
        dataset = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterDate(start_str, end_str)
                   .filterBounds(point.buffer(1000)) # Smaller buffer = more precise
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 95)) # Relaxed cloud filter
                   .map(add_ndvi)
                   .map(mask_s2_recovery))

        if dataset.size().getInfo() == 0:
            return None

        # 2. Use a Median composite instead of QualityMosaic for more stability
        img = dataset.median()
        
        # 3. Reduce Region with explicit CRS to avoid projection errors
        stats = img.reduceRegion(
            reducer=ee.Reducer.mean(), # Mean is more stable than 10th percentile for debugging
            geometry=point.buffer(500), # Focused area
            scale=30, # Sentinel-2 is 10m, but 30m is safer for broad analysis
            bestEffort=True
        ).getInfo()

        val = stats.get('NDVI')
        
        # Debugging print in terminal to see threads working
        if val:
            print(f"✅ Data for {start_str}: {val:.3f}")
        
        return {'time': start_str, 'NDVI': val} if val is not None else None
    except Exception as e:
        print(f"⚠️ Thread Error ({start_str}): {e}")
        return None

def analyze_area(lat: float, lon: float, start_str: str, end_str: str):
    poi = ee.Geometry.Point(lon, lat)
    start = datetime.strptime(start_str, '%Y-%m-%d')
    end = datetime.strptime(end_str, '%Y-%m-%d')
    
    chunks = []
    curr = start
    while curr <= end:
        m_start = curr.replace(day=1)
        m_end = (m_start + relativedelta(months=1))
        chunks.append((m_start.strftime('%Y-%m-%d'), m_end.strftime('%Y-%m-%d'), poi))
        curr += relativedelta(months=1)

    # Note: Reduced max_workers to 5 to avoid GEE rate-limiting (Quota Error)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        results = [r for r in list(executor.map(fetch_monthly_forest_signal, chunks)) if r is not None]
    
    results.sort(key=lambda x: x['time'])
    return results