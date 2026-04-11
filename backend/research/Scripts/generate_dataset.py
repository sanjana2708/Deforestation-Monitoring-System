import os
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
from core.gee_engine import analyze_area, authenticate_gee

def download_cnn_patch(date_str, point, save_dir):
    """Downloads a 224x224 RGB image for a specific anomaly date."""
    zoom_buffer = 750 
    image_size = 224
    
    try:
        start = pd.to_datetime(date_str)
        end = (start + relativedelta(months=1)).strftime('%Y-%m-%d')

        img_col = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterBounds(point.buffer(zoom_buffer))
                   .filterDate(date_str, end)
                   # Try 20% - a middle ground between Colab's 10% and Local's 40%
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))) 

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
        
def run_dataset_harvest(lat, lon, start_date, end_date, threshold=0.25):
    """Coordinates the NDVI analysis and anomaly image downloading."""
    
    # Define and create local storage
    save_dir = os.path.join(os.path.dirname(__file__), "../../data/cnn_dataset_raw")
    if not os.path.exists(save_dir):
        os.makedirs(save_dir, exist_ok=True)

    # 1. Fetch historical NDVI using the core engine
    print(f"📡 Requesting NDVI history for {lat}, {lon}...")
    raw_data = analyze_area(lat, lon, start_date, end_date)
    
    if not raw_data:
        print("❌ No data returned from GEE.")
        return

    df = pd.DataFrame(raw_data)
    df['time'] = pd.to_datetime(df['time'])
    df.set_index('time', inplace=True)
    
    # 2. Establish baseline (Auto-select 2021 or the earliest available year)
    baseline_year = 2021
    baseline_val = df[df.index.year == baseline_year]['NDVI'].mean()
    if pd.isna(baseline_val):
        baseline_val = df['NDVI'].mean()
        print(f"⚠️ 2021 data missing. Using overall mean as baseline.")
    
    print(f"✅ Forest Baseline: {baseline_val:.2f}")
    print(f"🚨 Triggering downloads for NDVI < {baseline_val - threshold:.2f}")

    # 3. Identify drops and download patches
    poi = ee.Geometry.Point([lon, lat])
    count = 0
    
    for index, row in df.iterrows():
        if row['NDVI'] < (baseline_val - threshold):
            date_label = index.strftime('%Y-%m-%d')
            print(f"🚨 Drop detected: {date_label} | Value: {row['NDVI']:.2f}")
            
            status = download_cnn_patch(date_label, poi, save_dir)
            print(status)
            if "Saved" in status: count += 1

    print(f"\n✨ Process Complete. {count} patches downloaded to: {save_dir}")

if __name__ == "__main__":
    if authenticate_gee():
        # Setup Command Line Arguments
        parser = argparse.ArgumentParser(description="Generate CNN training data from NDVI anomalies.")
        parser.add_argument("--lat", type=float, default=26.93, help="Latitude of target area")
        parser.add_argument("--lon", type=float, default=92.83, help="Longitude of target area")
        parser.add_argument("--start", type=str, default="2020-01-01", help="Start date (YYYY-MM-DD)")
        parser.add_argument("--end", type=str, default="2024-12-01", help="End date (YYYY-MM-DD)")
        parser.add_argument("--drop", type=float, default=0.25, help="NDVI drop threshold for anomalies")

        args = parser.parse_args()
        
        run_dataset_harvest(
            lat=args.lat, 
            lon=args.lon, 
            start_date=args.start, 
            end_date=args.end,
            threshold=args.drop
        )