import os
import requests
import argparse
import ee
import sys

# Ensure backend modules can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from core.gee_engine import authenticate_gee

import ee

def maskS2clouds(image):
    # Select the Quality Assessment band
    qa = image.select('QA60')
  
    # Bits 10 and 11 represent clouds and cirrus respectively
    cloudBitMask = 1 << 10
    cirrusBitMask = 1 << 11
  
    # Both flags must be set to zero for clear conditions
    # Note the capital 'And' used in the Python API
    mask = qa.bitwiseAnd(cloudBitMask).eq(0).And(qa.bitwiseAnd(cirrusBitMask).eq(0))
      
    # Apply the mask and scale the optical bands (divide by 10000)
    # Use copyProperties to preserve the image metadata (like timestamps)
    return image.updateMask(mask).divide(10000).copyProperties(image, ["system:time_start"])


def generate_timelapse(lat, lon, start_year, end_year, save_dir):
    """Generates and downloads a timelapse GIF."""
    print(f"📡 Generating timelapse for {lat}, {lon}...")
    
    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(500).bounds()

    frames = []
    years = list(range(start_year, end_year + 1))

    for year in years:
        col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
               .filterBounds(region)
               .filterDate(f'{year}-01-01', f'{year}-12-31')
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5)))

        if col.size().getInfo() == 0:
            print(f"⏩ Skipping {year}: No data.")
            continue

        img = col.map(maskS2clouds).median()
        bg = img.visualize(bands=['B4', 'B3', 'B2'], min=0, max=0.3, gamma=1.3)
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