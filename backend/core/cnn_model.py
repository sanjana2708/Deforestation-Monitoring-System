import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing.image import load_img, img_to_array
import os

# Update this to match the labels you created in simplify_tags
CLASS_LABELS = ['agriculture', 'healthy_forest', 'logging_road', 'mining']
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'ByteCoders_ForestModel_v2.keras')

# Load model once when the server starts
model = tf.keras.models.load_model(MODEL_PATH)

def classify_patch(image_path):
    """Predicts deforestation type for a specific image file."""
    img = load_img(image_path, target_size=(224, 224))
    img_array = img_to_array(img) / 255.0
    img_input = np.expand_dims(img_array, axis=0)

    preds = model.predict(img_input)
    pred_idx = np.argmax(preds[0])
    
    return {
        "label": CLASS_LABELS[pred_idx],
        "confidence": float(preds[0][pred_idx]),
        "all_probs": {CLASS_LABELS[i]: float(preds[0][i]) for i in range(len(CLASS_LABELS))}
    }