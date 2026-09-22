import pandas as pd
import os
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ==========================================
# 1. Load processed dataset
# ==========================================

DATA_FILE = "ml/datasets/yield/processed_yield_data.csv"

df = pd.read_csv(DATA_FILE)

print("Dataset loaded")
print("Shape:", df.shape)


# ==========================================
# 2. Basic cleaning
# ==========================================

df = df.copy()

# Remove impossible target values
df = df[df["yield"] >= 0]

# Clean text
df["crop"] = df["crop"].astype(str).str.strip()
df["state"] = df["state"].astype(str).str.strip()
df["Season"] = df["Season"].astype(str).str.strip()


# ==========================================
# 3. Select features
# ==========================================

features = [
    "crop",
    "year",
    "Season",
    "state",
    "area",
    "rainfall_mm",
    "temperature_C"
]

target = "yield"

X = df[features]
y = df[target]


# ==========================================
# 4. Time-based split
# ==========================================

# Training: 1997–2022
# Validation: 2023
# Testing: 2024

train_df = df[df["year"] <= 2022]
val_df = df[df["year"] == 2023]
test_df = df[df["year"] == 2024]

X_train = train_df[features]
y_train = train_df[target]

X_val = val_df[features]
y_val = val_df[target]

X_test = test_df[features]
y_test = test_df[target]

print("\nTraining rows:", len(train_df))
print("Validation rows:", len(val_df))
print("Test rows:", len(test_df))


# ==========================================
# 5. Feature types
# ==========================================

categorical_features = [
    "crop",
    "Season",
    "state"
]

numeric_features = [
    "year",
    "area",
    "rainfall_mm",
    "temperature_C"
]


# ==========================================
# 6. Preprocessing
# ==========================================

numeric_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median"))
    ]
)

categorical_pipeline = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        (
            "encoder",
            OneHotEncoder(
                handle_unknown="ignore",
                sparse_output=False
            )
        )
    ]
)

preprocessor = ColumnTransformer(
    transformers=[
        ("numeric", numeric_pipeline, numeric_features),
        ("categorical", categorical_pipeline, categorical_features)
    ]
)


# ==========================================
# 7. Random Forest model
# ==========================================

model = RandomForestRegressor(
    n_estimators=300,
    max_depth=25,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)


# ==========================================
# 8. Complete ML pipeline
# ==========================================

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)


# ==========================================
# 9. Train
# ==========================================

print("\nTraining Random Forest...")

pipeline.fit(X_train, y_train)

print("Training completed!")


# ==========================================
# 10. Validation
# ==========================================

val_predictions = pipeline.predict(X_val)

val_mae = mean_absolute_error(y_val, val_predictions)
val_rmse = mean_squared_error(
    y_val,
    val_predictions
) ** 0.5
val_r2 = r2_score(y_val, val_predictions)

print("\n===== VALIDATION RESULTS (2023) =====")
print("MAE :", round(val_mae, 2))
print("RMSE:", round(val_rmse, 2))
print("R2  :", round(val_r2, 4))


# ==========================================
# 11. Final test
# ==========================================

test_predictions = pipeline.predict(X_test)

test_mae = mean_absolute_error(
    y_test,
    test_predictions
)

test_rmse = mean_squared_error(
    y_test,
    test_predictions
) ** 0.5

test_r2 = r2_score(
    y_test,
    test_predictions
)

print("\n===== TEST RESULTS (2024) =====")
print("MAE :", round(test_mae, 2))
print("RMSE:", round(test_rmse, 2))
print("R2  :", round(test_r2, 4))


# ==========================================
# 12. Save model
# ==========================================

MODEL_DIR = "ml/models/yield"

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

MODEL_FILE = os.path.join(
    MODEL_DIR,
    "yield_model.joblib"
)

joblib.dump(
    pipeline,
    MODEL_FILE
)

print("\nModel saved successfully!")
print("Location:", MODEL_FILE)


# ==========================================
# 13. Save metrics
# ==========================================

metrics = {
    "validation_year": 2023,
    "test_year": 2024,
    "validation_mae": val_mae,
    "validation_rmse": val_rmse,
    "validation_r2": val_r2,
    "test_mae": test_mae,
    "test_rmse": test_rmse,
    "test_r2": test_r2,
    "training_rows": len(train_df),
    "validation_rows": len(val_df),
    "test_rows": len(test_df)
}

metrics_df = pd.DataFrame([metrics])

metrics_df.to_csv(
    "ml/models/yield/yield_model_metrics.csv",
    index=False
)

print("Metrics saved successfully!")