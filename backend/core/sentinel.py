import ee
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import concurrent.futures

# --- RECOVERY MASK ---
def mask_s2_recovery(image):
    scl = image.select('SCL')
    # Keep vegetation, soils, and water; exclude shadows and thick clouds
    # 3=Shadow, 8=Med Cloud, 9=High Cloud, 10=Cirrus
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10))
    return image.updateMask(mask)

def add_ndvi(image):
    # Scale the bands first (Sentinel-2 SR data is scaled by 10000)
    img_scaled = image.divide(10000)
    ndvi = img_scaled.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands(ndvi)

def fetch_ndvi_all_weather(date_tuple):
    s, e, point = date_tuple
    try:
        # Filter and Pre-process
        dataset = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterDate(s, e)
                   .filterBounds(point.buffer(5000))
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 95))
                   .map(add_ndvi)
                   .map(mask_s2_recovery))

        # Check if collection is empty
        if dataset.size().getInfo() == 0:
            return None

        # THE QUALITY MOSAIC: Pick the greenest pixels available in that week
        img = dataset.qualityMosaic('NDVI')

        # Reducer with Band Name Fallback
        stats = img.reduceRegion(
            reducer=ee.Reducer.percentile([10]),
            geometry=point.buffer(5000).bounds(),
            scale=100
        ).getInfo()

        # Logic to handle GEE's inconsistent band naming after reduction
        val = stats.get('NDVI_p10') if stats.get('NDVI_p10') is not None else stats.get('NDVI')

        return {'time': s, 'NDVI': val} if val is not None else None
    except Exception:
        return None

# --- EXECUTION CONFIG ---
# Pakke Tiger Reserve area
poi = ee.Geometry.Point(93.30809791534341,27.90907934376186)
start_date = datetime(2016, 1, 1)
end_date = datetime(2024, 2, 27)

chunks = []
curr = start_date
while curr <= end_date:
    chunks.append((curr.strftime('%Y-%m-%d'), (curr + timedelta(days=6)).strftime('%Y-%m-%d'), poi))
    curr += timedelta(days=7)

print(f"ByteCoders Engine: Analyzing {len(chunks)} weeks in the Eastern Himalayas...")

# ThreadPool for speed
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    raw_results = list(executor.map(fetch_ndvi_all_weather, chunks))
    results = [r for r in raw_results if r is not None]

print(f"Data Found: {len(results)} valid weeks.")

# --- PLOTTING ---
if len(results) > 0:
    df = pd.DataFrame(results)
    df['time'] = pd.to_datetime(df['time'])
    df = df.set_index('time').sort_index()

    # Interpolate to fill any remaining gaps from extreme monsoon weeks
    df_final = df.interpolate(method='linear')

    plt.figure(figsize=(14, 6))
    plt.plot(df_final.index, df_final['NDVI'], color='#e67e22', linewidth=2, label='Forest Signal (p10)')
    plt.scatter(df.index, df['NDVI'], color='#d35400', s=15, alpha=0.4, label='Detected Points')
    plt.title('High-Sensitivity Forest Monitoring (Eastern Himalayas)')
    plt.ylabel('NDVI Value')
    plt.legend()
    plt.grid(True, alpha=0.2)
    plt.show()
else:
    print("Zero Data. Check: 1. GEE Project Scoping. 2. Internet Connection. 3. Buffer Size.")