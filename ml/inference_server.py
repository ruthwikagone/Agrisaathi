from pathlib import Path
import json

from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
from tensorflow import keras

# AGRO project root
ROOT = Path(__file__).resolve().parents[1]

# Location of our trained models
MODEL_ROOT = ROOT / "ml" / "models" / "plant_disease"

IMG_SIZE = (128, 128)

# Crop -> model + class names
CROPS = {
    "rice": {
        "model": "rice_disease.keras",
        "classes": "rice_classes.json"
    },
    "chilli": {
        "model": "chilli_disease.keras",
        "classes": "chilli_classes.json"
    },
    "maize": {
        "model": "maize_disease.keras",
        "classes": "maize_classes.json"
    },
    "groundnut": {
        "model": "groundnut_disease.keras",
        "classes": "groundnut_classes.json"
    },
    "cotton": {
        "model": "cotton_disease.keras",
        "classes": "cotton_classes.json"
    }
}

app = Flask(__name__)

# Models are loaded once when the server starts
models = {}
classes = {}


def load_models():

    for crop, files in CROPS.items():

        model_path = MODEL_ROOT / files["model"]
        class_path = MODEL_ROOT / files["classes"]

        print(f"Loading {crop}...")

        models[crop] = keras.models.load_model(model_path)

        with open(class_path, "r", encoding="utf-8") as f:
            classes[crop] = json.load(f)

        print(f"{crop}: {classes[crop]}")

    print("All disease models loaded.")


@app.get("/health")
def health():

    return jsonify({
        "ok": True,
        "service": "AgriSaathi Disease AI",
        "models_loaded": list(models.keys())
    })


@app.post("/predict")
def predict():

    # Check image
    if "image" not in request.files:

        return jsonify({
            "ok": False,
            "error": "No image uploaded"
        }), 400

    # Get crop
    crop = request.form.get("crop", "").lower().strip()

    if crop not in CROPS:

        return jsonify({
            "ok": False,
            "error": "Invalid crop",
            "available_crops": list(CROPS.keys())
        }), 400

    try:

        image_file = request.files["image"]

        # Open image
        image = Image.open(image_file).convert("RGB")

        # Resize exactly like training
        image = image.resize(IMG_SIZE)

        # Convert to NumPy
        image_array = np.array(
            image,
            dtype=np.float32
        )

        # Add batch dimension
        image_array = np.expand_dims(
            image_array,
            axis=0
        )

        # Predict
        probabilities = models[crop].predict(
            image_array,
            verbose=0
        )[0]

        # Highest probability
        predicted_index = int(
            np.argmax(probabilities)
        )

        disease = classes[crop][predicted_index]

        confidence = float(
            probabilities[predicted_index]
        ) * 100

        return jsonify({
            "ok": True,
            "crop": crop,
            "disease": disease,
            "confidence": round(confidence, 2)
        })

    except Exception as e:

        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":

    print("Starting AgriSaathi Disease AI...")

    load_models()

    app.run(
        host="127.0.0.1",
        port=5001,
        debug=False
    )