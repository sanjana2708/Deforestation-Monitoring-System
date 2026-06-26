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

def fetch_forest_signal(date_tuple):
    """Worker function to fetch NDVI signal for a single date chunk (daily/weekly/monthly)."""
    start_str, end_str, point = date_tuple
    try:
        # Build the collection: S2_SR_HARMONIZED is best for post-2018 data.
        dataset = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterDate(start_str, end_str)
                   .filterBounds(point.buffer(1000))
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 95))
                   .map(add_ndvi)
                   .map(mask_s2_recovery))

        # Use a Median composite for stability; skip size() check to reduce API round-trips.
        # GEE will raise an exception if no images are available, caught below.
        img = dataset.median()
        
        stats = img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=point.buffer(500),
            scale=30,
            bestEffort=True
        ).getInfo()

        val = stats.get('NDVI')
        
        if val:
            print(f"✅ Data for {start_str}: {val:.3f}")
        
        return {'time': start_str, 'NDVI': val} if val is not None else None
    except Exception as e:
        err_str = str(e)
        # Suppress expected 'no bands' errors from empty date windows silently
        if 'no bands' in err_str.lower() or 'imagecollection.reduce' in err_str.lower():
            return None
        print(f"⚠️ Thread Error ({start_str}): {e}")
        return None

# In-memory storage to share/cache NDVI data between /analyze and /trigger-harvest calls
session_ndvi_data = {}

def get_session_ndvi(lat: float, lon: float, start_str: str, end_str: str):
    key = (round(lat, 5), round(lon, 5), start_str, end_str)
    return session_ndvi_data.get(key)

def set_session_ndvi(lat: float, lon: float, start_str: str, end_str: str, data):
    key = (round(lat, 5), round(lon, 5), start_str, end_str)
    session_ndvi_data[key] = data

def analyze_area(lat: float, lon: float, start_str: str, end_str: str):
    cached = get_session_ndvi(lat, lon, start_str, end_str)
    if cached is not None:
        print(f"🎯 Using cached NDVI data for {lat}, {lon} ({start_str} to {end_str})")
        return cached

    poi = ee.Geometry.Point(lon, lat)
    start = datetime.strptime(start_str, '%Y-%m-%d')
    end = datetime.strptime(end_str, '%Y-%m-%d')
    total_days = (end - start).days

    chunks = []
    curr = start

    if total_days < 7:
        # Daily granularity for very short date ranges (< 7 days)
        print(f"📅 Using daily intervals ({total_days} days range)")
        while curr <= end:
            day_end = curr + relativedelta(days=1)
            chunks.append((curr.strftime('%Y-%m-%d'), day_end.strftime('%Y-%m-%d'), poi))
            curr += relativedelta(days=1)
    elif total_days < 30:
        # Weekly granularity for ranges between 7 and 29 days
        print(f"📅 Using weekly intervals ({total_days} days range)")
        while curr <= end:
            week_end = curr + relativedelta(weeks=1)
            chunks.append((curr.strftime('%Y-%m-%d'), week_end.strftime('%Y-%m-%d'), poi))
            curr += relativedelta(weeks=1)
    else:
        # Monthly granularity for ranges >= 30 days (default)
        print(f"📅 Using monthly intervals ({total_days} days range)")
        while curr <= end:
            m_start = curr.replace(day=1)
            m_end = (m_start + relativedelta(months=1))
            chunks.append((m_start.strftime('%Y-%m-%d'), m_end.strftime('%Y-%m-%d'), poi))
            curr += relativedelta(months=1)

    with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
        results = [r for r in list(executor.map(fetch_forest_signal, chunks)) if r is not None]
    
    results.sort(key=lambda x: x['time'])
    set_session_ndvi(lat, lon, start_str, end_str, results)
    return results