import os
import numpy as np
import onnxruntime as ort
from tensorflow.keras.preprocessing.image import load_img, img_to_array

# 1. Maintain your exact downstream categories for server compatibility
CLASS_LABELS = ['agriculture','cloudy','habitation', 'healthy_forest', 'logging_road', 'mining','water_body']

# Update path pointing to your newly created universal ONNX asset
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'deforestation_model.onnx')

# 2. Load the universal execution graph once when the server boots
session = ort.InferenceSession(MODEL_PATH)
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# The exact 17-class mapping array used during our TPU training loop
ONNX_CLASSES = [
    'agriculture', 'artisinal_mine', 'bare_ground', 'blooming', 
    'blow_down', 'clear', 'cloudy', 'conventional_mine', 
    'cultivation', 'habitation', 'haze', 'partly_cloudy', 
    'primary', 'road', 'selective_logging', 'slash_burn', 'water'
]
onnx_tag_to_idx = {tag: idx for idx, tag in enumerate(ONNX_CLASSES)}

def classify_patch(image_path):
    """Predicts deforestation type by mapping multi-label ONNX signatures to project classes."""
    # Load image matching our model dimensions
    img = load_img(image_path, target_size=(224, 224))
    img_array = img_to_array(img) / 255.0  # Scale to [0.0, 1.0]
    
    # CRITICAL: Apply ImageNet normalization matches used during model training
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    normalized_img = (img_array - mean) / std
    
    # BRIDGE: Transpose from TensorFlow Channels-Last (H, W, C) to ONNX Channels-First (C, H, W)
    img_onnx = np.transpose(normalized_img, (2, 0, 1))
    img_input = np.expand_dims(img_onnx, axis=0).astype(np.float32) # Add batch: [1, 3, 224, 224]

    # Run execution pass through the ONNX runtime session
    raw_outputs = session.run([output_name], {input_name: img_input})
    logits = raw_outputs[0][0]
    
    # Apply Sigmoid activation mathematically to get absolute probabilities
    probs = 1 / (1 + np.exp(-logits))
    
    # 3. INTELLIGENT RULE MAPPING ENGINE (17 Multi-Labels -> 4 Project Classes)
    # Extract specific channel weights
    p_agri = probs[onnx_tag_to_idx['agriculture']]
    p_cult = probs[onnx_tag_to_idx['cultivation']]
    p_road = probs[onnx_tag_to_idx['road']]
    p_log  = probs[onnx_tag_to_idx['selective_logging']]
    p_art  = probs[onnx_tag_to_idx['artisinal_mine']]
    p_conv = probs[onnx_tag_to_idx['conventional_mine']]
    p_bare = probs[onnx_tag_to_idx['bare_ground']]
    p_prim = probs[onnx_tag_to_idx['primary']]
    p_water = probs[onnx_tag_to_idx['water']]
    p_hab = probs[onnx_tag_to_idx['habitation']]
    p_cloud = probs[onnx_tag_to_idx['cloudy']]
    p_pcloudy = probs[onnx_tag_to_idx['partly_cloudy']]
    p_haze = probs[onnx_tag_to_idx['haze']]
    # Synthesize probabilities down to your 4 primary labels
    mapped_probs = {
        'agriculture':    float(max(p_agri, p_cult)),
        'cloudy':         float(p_cloud),
        'habitation':     float(p_hab),
        'logging_road':   float(max(p_road, p_log)),
        'mining':         float(max(p_art, p_conv)),
        'water_body':     float(p_water),
        'healthy_forest': float(p_prim * (1.0 - max(p_agri, p_road, p_log, p_art, p_conv)))
    }
    
    # 4. DETERMINE ARGMAX BASED ON SYNTHESIZED LABELS
    preds_vector = [mapped_probs[label] for label in CLASS_LABELS]
    pred_idx = np.argmax(preds_vector)
    
    return {
        "label": CLASS_LABELS[pred_idx],
        "confidence": mapped_probs[CLASS_LABELS[pred_idx]],
        "all_probs": mapped_probs
    }