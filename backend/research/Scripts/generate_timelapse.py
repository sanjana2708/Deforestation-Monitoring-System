import os
import requests
import argparse
import ee
import sys

# Ensure backend modules can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from core.gee_engine import authenticate_gee

def mask_s2_clouds(image):
    """Simple cloud mask helper."""
    qa = image.select('QA60')
    mask = qa.bitwiseAnd(1 << 10).eq(0).And(qa.bitwiseAnd(1 << 11).eq(0))
    return image.updateMask(mask)

def generate_timelapse(lat, lon, start_year, end_year, save_dir):
    """Generates and downloads a timelapse GIF."""
    print(f"📡 Generating timelapse for {lat}, {lon}...")
    
    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(1500).bounds()

    frames = []
    years = list(range(start_year, end_year + 1))

    for year in years:
        col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
               .filterBounds(region)
               .filterDate(f'{year}-01-17', f'{year}-02-27')
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

        if col.size().getInfo() == 0:
            print(f"⏩ Skipping {year}: No data.")
            continue

        img = col.map(mask_s2_clouds).median()
        bg = img.visualize(bands=['B4', 'B3', 'B2'], min=0, max=3000, gamma=1.3)
        frames.append(bg)

    if not frames:
        print("❌ Error: No frames generated.")
        return

    timelapse_col = ee.ImageCollection.fromImages(frames)
    video_url = timelapse_col.getVideoThumbURL({
        'dimensions': 1024,
        'fps': 0.5,
        'region': region,
        'format': 'gif'
    })

    # Download the binary data
    print("📥 Downloading GIF...")
    response = requests.get(video_url)
    if response.status_code == 200:
        filename = f"timelapse_{lat}_{lon}_{start_year}_{end_year}.gif"
        save_path = os.path.join(save_dir, filename)
        with open(save_path, 'wb') as f:
            f.write(response.content)
        print(f"✅ Success! GIF saved to: {save_path}")
    else:
        print(f"❌ Download failed: {response.status_code}")

if __name__ == "__main__":
    if authenticate_gee():
        parser = argparse.ArgumentParser()
        parser.add_argument("--lat", type=float, default=26.91)
        parser.add_argument("--lon", type=float, default=93.30)
        parser.add_argument("--start", type=int, default=2020)
        parser.add_argument("--end", type=int, default=2025)
        args = parser.parse_args()

        output_dir = os.path.join(os.path.dirname(__file__), "../../data/timelapses")
        os.makedirs(output_dir, exist_ok=True)
        
        generate_timelapse(args.lat, args.lon, args.start, args.end, output_dir)