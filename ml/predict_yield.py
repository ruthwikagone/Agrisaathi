import sys
import json
import joblib
import pandas as pd


MODEL_FILE = "ml/models/yield/yield_model.joblib"


def predict(data):

    model = joblib.load(MODEL_FILE)

    # UI → model feature mapping
    crop = data.get("currentCrop") or data.get("crop") or "Rice"
    state = data.get("state") or "Telangana"
    season = data.get("Season") or "Unknown"

    area = data.get("farmArea")
    if area in [None, ""]:
        area = None
    else:
        area = float(area)

    rainfall = data.get("rainfall_mm")
    temperature = data.get("temperature_C")

    # Defaults when weather is not supplied by UI yet
    if rainfall in [None, ""]:
        rainfall = 1000.0

    if temperature in [None, ""]:
        temperature = 27.0

    year = data.get("year")
    if year in [None, ""]:
        year = 2024
    else:
        year = int(year)

    input_data = pd.DataFrame([{
        "crop": crop,
        "year": year,
        "Season": season,
        "state": state,
        "area": area,
        "rainfall_mm": float(rainfall),
        "temperature_C": float(temperature)
    }])

    prediction = float(model.predict(input_data)[0])

    # Prevent negative yield
    prediction = max(0.0, prediction)

    production = None

    if area is not None:
        production = prediction * area

    return {
        "predictedYield": round(prediction, 2),
        "yieldUnit": "kg/ha",
        "farmArea": area,
        "estimatedProduction": round(production, 2)
        if production is not None else None,
        "modelVersion": "yield-rf-2024",
        "year": year,
        "crop": crop,
        "state": state
    }


if __name__ == "__main__":

    try:
        raw = sys.stdin.read()

        if not raw:
            raise ValueError("No input received")

        data = json.loads(raw)

        result = predict(data)

        print(json.dumps(result))

    except Exception as e:

        print(json.dumps({
            "error": str(e)
        }))

        sys.exit(1)