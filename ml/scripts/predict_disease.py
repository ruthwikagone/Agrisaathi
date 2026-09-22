from pathlib import Path
import json
import sys

import numpy as np
from tensorflow import keras


ROOT = Path(__file__).resolve().parents[2]
MODEL_ROOT = ROOT / "ml" / "models" / "plant_disease"

IMG_SIZE = (128, 128)

CROPS = {
    "rice": {
        "model": "rice_disease.keras",
        "classes": "rice_classes.json",
    },
    "chilli": {
        "model": "chilli_disease.keras",
        "classes": "chilli_classes.json",
    },
    "maize": {
        "model": "maize_disease.keras",
        "classes": "maize_classes.json",
    },
    "groundnut": {
        "model": "groundnut_disease.keras",
        "classes": "groundnut_classes.json",
    },
    "cotton": {
        "model": "cotton_disease.keras",
        "classes": "cotton_classes.json",
    },
}


def predict(crop, image_path):
    if crop not in CROPS:
        print("Invalid crop.")
        print("Available:", ", ".join(CROPS.keys()))
        return

    image_path = Path(image_path)

    if not image_path.exists():
        print(f"Image not found: {image_path}")
        return

    model_path = MODEL_ROOT / CROPS[crop]["model"]
    class_path = MODEL_ROOT / CROPS[crop]["classes"]

    model = keras.models.load_model(model_path)

    with open(class_path, "r", encoding="utf-8") as f:
        classes = json.load(f)

    image = keras.utils.load_img(
        image_path,
        target_size=IMG_SIZE
    )

    image_array = keras.utils.img_to_array(image)
    image_array = np.expand_dims(image_array, axis=0)

    probabilities = model.predict(image_array, verbose=0)[0]

    predicted_index = int(np.argmax(probabilities))
    predicted_class = classes[predicted_index]
    confidence = float(probabilities[predicted_index]) * 100

    print("\n" + "=" * 50)
    print("AGRI SAATHI DISEASE PREDICTION")
    print("=" * 50)
    print("Crop:", crop)
    print("Image:", image_path.name)
    print("Prediction:", predicted_class)
    print(f"Confidence: {confidence:.2f}%")
    print("=" * 50)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage:")
        print("python predict_disease.py <crop> <image_path>")
        print()
        print("Example:")
        print("python predict_disease.py cotton image.jpg")
        sys.exit(1)

    crop = sys.argv[1].lower()
    image_path = sys.argv[2]

    predict(crop, image_path)