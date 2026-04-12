# ForestSentinel: Satellite-Based Deforestation Monitoring

ForestSentinel is a high-performance system designed for real-time monitoring and classification of deforestation anomalies. It combines **Google Earth Engine (GEE)** for geospatial data processing, a **MobileNetV2 CNN** for classification, and a **React/Python full-stack architecture** to deliver actionable insights.

## 🚀 System Architecture

The system operates on a modular pipeline:
1.  **Harvesting:** Automated NDVI anomaly detection via GEE.
2.  **Processing:** Satellite chip extraction ($224 \times 224$ pixels) for ML inference.
3.  **Classification:** MobileNetV2-based classification of forest change drivers (e.g., mining, roads, agriculture).
4.  **Dashboard:** Interactive React interface for visualizing time-series NDVI trends and CNN predictions.



## 🛠 Tech Stack

* **Frontend:** React, Recharts, CSS Grid (Custom Dashboard).
* **Backend:** Python (Flask/FastAPI), Google Earth Engine (Python API).
* **Machine Learning:** PyTorch (MobileNetV2), custom preprocessing pipeline.
* **Infrastructure:** Python-based scripts for automated data management and directory cleanup.

## 📂 Project Structure

```text
forest-sentinel/
├── api/                # API client definitions
├── backend/
│   ├── data/
│   │   └── cnn_dataset_raw/ # Automated dataset patches
│   └── scripts/
│       └── generate_dataset.py # Harvesting logic
├── components/
│   ├── dashboard/      # UI widgets (Map, Gauge, Charts)
│   └── cnn/            # CNN analysis components
└── utils/              # Forest insights & analytics logic
```
## ⚡ Key Features

* **Dynamic AOI Analysis:** Users define coordinates and date ranges to trigger live GEE analysis.
* **NDVI Time-Series:** Visual tracking of vegetation health over time to identify drop anomalies.
* **Automated Dataset Sync:** The `generate_dataset.py` script automatically clears the raw data directory before new harvests, ensuring model inference is always based on the latest satellite imagery.
* **Risk Gauging:** An integrated risk scoring utility that categorizes alerts as Low, Medium, or High based on NDVI delta and historical trends.

## 📊 Risk Scoring Logic

The system assesses canopy degradation using the following NDVI delta thresholds:

| Risk Level | NDVI Delta | Insight |
| :--- | :--- | :--- |
| **Low** | $>-0.05$ | Seasonal variation; healthy state. |
| **Medium** | $-0.05$ to $-0.15$ | Early-stage degradation/thinning. |
| **High** | $<-0.15$ | Significant loss; likely deforestation or land-use change. |



## ⚙️ Quick Start

### Backend
1. Ensure your GEE credentials are configured.
2. Set up the environment: `pip install -r requirements.txt`.
3. The dataset harvester automatically manages the `data/cnn_dataset_raw` folder to prevent stale data.

### Frontend
1. Install dependencies: `npm install`.
2. Run the dashboard: `npm start`.
3. Navigate to the "Detailed Analysis" section to trigger the CNN harvest pipeline.
