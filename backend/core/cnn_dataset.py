"""Scan CNN raw dataset folder, classify images with optional mtime-based cache."""
from __future__ import annotations

import mimetypes
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from core.cnn_model import classify_patch

IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff'}

# backend/core -> backend
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
CNN_DATASET_DIR = _BACKEND_ROOT / 'data' / 'cnn_dataset_raw'

# filename -> (mtime_ns, prediction dict)
_prediction_cache: Dict[str, Tuple[int, Dict[str, Any]]] = {}


def dataset_dir() -> Path:
    return CNN_DATASET_DIR


def list_image_files() -> List[str]:
    d = CNN_DATASET_DIR
    if not d.is_dir():
        return []
    names: List[str] = []
    for name in os.listdir(d):
        path = d / name
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
            names.append(name)
    names.sort(key=lambda n: (d / n).stat().st_mtime_ns, reverse=True)
    return names


def resolve_safe_file_path(filename: str) -> Optional[Path]:
    """Return resolved path if filename is a safe basename under CNN_DATASET_DIR."""
    if not filename or filename != Path(filename).name:
        return None
    if '/' in filename or '\\' in filename or filename in ('.', '..'):
        return None
    base = CNN_DATASET_DIR.resolve()
    candidate = (CNN_DATASET_DIR / filename).resolve()
    try:
        candidate.relative_to(base)
    except ValueError:
        return None
    if not candidate.is_file():
        return None
    return candidate


def get_items(limit: int = 40, refresh: bool = False) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Classify up to `limit` most recently modified images.
    Returns (items, aggregate) where aggregate maps top-1 label -> count.
    """
    items: List[Dict[str, Any]] = []
    aggregate: Dict[str, int] = {}

    names = list_image_files()[: max(0, limit)]
    d = CNN_DATASET_DIR

    for name in names:
        path = d / name
        mtime = path.stat().st_mtime_ns

        if not refresh and name in _prediction_cache and _prediction_cache[name][0] == mtime:
            pred = _prediction_cache[name][1]
        else:
            pred = classify_patch(str(path))
            _prediction_cache[name] = (mtime, pred)

        label = pred.get('label')
        if label:
            aggregate[label] = aggregate.get(label, 0) + 1

        items.append({'filename': name, 'prediction': pred})

    return items, aggregate


def guess_media_type(filename: str) -> str:
    t, _ = mimetypes.guess_type(filename)
    return t or 'application/octet-stream'
