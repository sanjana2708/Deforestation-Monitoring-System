"""Build Earth Engine timelapse GIF URLs (same logic as research/Scripts/generate_timelapse.py)."""
from typing import Optional

import ee
from core.gee_engine import authenticate_gee


def _mask_s2_clouds(image):
    qa = image.select('QA60')
    mask = qa.bitwiseAnd(1 << 10).eq(0).And(qa.bitwiseAnd(1 << 11).eq(0))
    return image.updateMask(mask)


def get_timelapse_gif_url(lat: float, lon: float, start_year: int, end_year: int) -> Optional[str]:
    """
    Returns a temporary Earth Engine thumbnail URL for an animated GIF, or None if no frames.
    """
    authenticate_gee()

    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(1500).bounds()
    frames = []

    for year in range(start_year, end_year + 1):
        col = (
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(region)
            .filterDate(f'{year}-01-17', f'{year}-02-27')
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        )

        if col.size().getInfo() == 0:
            continue

        img = col.map(_mask_s2_clouds).median()
        bg = img.visualize(bands=['B4', 'B3', 'B2'], min=0, max=3000, gamma=1.3)
        frames.append(bg)

    if not frames:
        return None

    timelapse_col = ee.ImageCollection.fromImages(frames)
    return timelapse_col.getVideoThumbURL(
        {
            'dimensions': 1024,
            'fps': 0.5,
            'region': region,
            'format': 'gif',
        }
    )
