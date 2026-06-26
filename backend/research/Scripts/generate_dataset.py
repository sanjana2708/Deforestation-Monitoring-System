import os
import concurrent.futures
import requests
import pandas as pd
import argparse
from io import BytesIO
from PIL import Image
from dateutil.relativedelta import relativedelta
import ee

# Import the engine logic from your backend
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))
from core.gee_engine import analyze_area, authenticate_gee, get_session_ndvi

# Keep your existing imports, just ensure the file is accessible
def execute_harvest(lat, lon, start, end):
    save_dir = os.path.join(os.path.dirname(__file__), "../../data/cnn_dataset_raw")
    if not os.path.exists(save_dir):
        os.makedirs(save_dir, exist_ok=True)

    if os.path.exists(save_dir):
        print(f"🧹 Clearing existing dataset at {save_dir}...")
        # Remove all files in the directory without deleting the directory itself
        for filename in os.listdir(save_dir):
            file_path = os.path.join(save_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path) # Removes the file or link
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path) # Removes subdirectories
            except Exception as e:
                print(f"⚠️ Failed to delete {file_path}. Reason: {e}")
    else:
        os.makedirs(save_dir, exist_ok=True)
        
    # 1. Fetch historical NDVI using the session cache or the core engine
    print(f"📡 Requesting NDVI history for {lat}, {lon}...")
    raw_data = get_session_ndvi(lat, lon, start, end)
    if raw_data:
        print("🎯 Using cached NDVI data from session cache!")
    else:
        print("🔄 No session cache found, making GEE API call...")
        raw_data = analyze_area(lat, lon, start, end)
    
    if not raw_data:
        print("❌ No data returned from GEE.")
        return

    df = pd.DataFrame(raw_data)
    df['time'] = pd.to_datetime(df['time'])
    df.set_index('time', inplace=True)
    
    # 2. Establish baseline (Auto-select 2021 or the earliest available year)
    baseline_val = df['NDVI'].mean()
    if pd.isna(baseline_val):
        baseline_val = df['NDVI'].mean()
        print(f"⚠️ data missing. Using overall mean as baseline.")
    
    print(f"✅ Forest Baseline: {baseline_val:.3f}")
    threshold = baseline_val*0.01
    print(f"🚨 Triggering downloads for NDVI < {baseline_val - threshold:.3f}")

    # 3. Identify drops and download patches
    poi = ee.Geometry.Point([lon, lat])
    
    # Identify anomaly dates first
    anomalies = []
    for index, row in df.iterrows():
        if row['NDVI'] < (baseline_val - threshold):
            anomalies.append(index.strftime('%Y-%m-%d'))
            
    print(f"🚀 Starting harvest pool with {len(anomalies)} anomalies...")

    def download_worker(date_label):
        try:
            status = download_cnn_patch(date_label, poi, save_dir)
            print(f"Result for {date_label}: {status}")
            return status
        except Exception as e:
            print(f"❌ Error at {date_label}. Details: {e}")
            return f"Error: {e}"

    count = 0
    if anomalies:
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            # Map the worker function to all identified anomaly dates
            results = list(executor.map(download_worker, anomalies))
            
        for res in results:
            if res and "Saved" in res:
                count += 1

    print(f"\n✨ Harvest Complete. {count} patches downloaded.")

def download_cnn_patch(date_str, point, save_dir):
    """Downloads a 224x224 RGB image for a specific anomaly date."""
    zoom_buffer = 1120
    image_size = 224
    
    try:
        start = pd.to_datetime(date_str)
        end = (start + relativedelta(months=1)).strftime('%Y-%m-%d')

        img_col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterBounds(point.buffer(zoom_buffer))
                   .filterDate(date_str, end)
                   # Try 20% - a middle ground between Colab's 10% and Local's 40%
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))) 

        if img_col.size().getInfo() == 0:
            return f"⏩ Skipped {date_str}: No imagery found under 20% clouds."

        # REMOVED .clip() to maintain anti-aliasing quality
        rgb_img = img_col.median().select(['B4', 'B3', 'B2'])

        # MATCHED Colab region style
        vis_url = rgb_img.getThumbURL({
            'min': 0, 
            'max': 3000,
            'dimensions': image_size,
            'region': point.buffer(zoom_buffer).bounds(), 
            'format': 'png'
        })

        response = requests.get(vis_url)
        if response.status_code != 200:
             return f"⚠️ GEE Server refused thumbnail: {response.text}"

        img = Image.open(BytesIO(response.content))
        filename = f"patch_{date_str}_pending.png"
        img.save(os.path.join(save_dir, filename))
        return f"💾 Patch Saved (Colab Quality): {filename}"
    except Exception as e:
        return f"⚠️ Export Error: {e}"
        
if __name__ == "__main__":
    if authenticate_gee():
        # Setup Command Line Arguments
        parser = argparse.ArgumentParser(description="Generate CNN training data from NDVI anomalies.")
        parser.add_argument("--lat", type=float, default=26.93, help="Latitude of target area")
        parser.add_argument("--lon", type=float, default=92.83, help="Longitude of target area")
        parser.add_argument("--start", type=str, default="2020-01-01", help="Start date (YYYY-MM-DD)")
        parser.add_argument("--end", type=str, default="2024-12-01", help="End date (YYYY-MM-DD)")

        args = parser.parse_args()
        
        execute_harvest(
            lat=args.lat, 
            lon=args.lon, 
            start=args.start, 
            end=args.end
        )