import pandas as pd
import os

# ==============================
# File paths
# ==============================

historical_file = "ml/datasets/yield/historical/Crop Yeild Data.csv"
recent_file = "ml/datasets/yield/recent/FAO_Crop_data.csv"

output_file = "ml/datasets/yield/processed_yield_data.csv"


# ==============================
# Load datasets
# ==============================

print("Loading historical dataset...")
historical = pd.read_csv(historical_file)

print("Loading recent dataset...")
recent = pd.read_csv(recent_file)


# ==============================
# Standardize historical dataset
# ==============================

historical_clean = historical[
    [
        "Crop",
        "Crop_Year",
        "Season",
        "State",
        "Area",
        "Annual_Rainfall",
        "Avg_Temperature",
        "Yield"
    ]
].copy()

historical_clean.rename(
    columns={
        "Crop": "crop",
        "Crop_Year": "year",
        "State": "state",
        "Area": "area",
        "Annual_Rainfall": "rainfall_mm",
        "Avg_Temperature": "temperature_C",
        "Yield": "yield"
    },
    inplace=True
)


# ==============================
# Standardize recent dataset
# ==============================

recent_clean = recent[
    [
        "year",
        "state",
        "crop",
        "rainfall_mm",
        "temperature_C",
        "yield_kg_ha"
    ]
].copy()

recent_clean.rename(
    columns={
        "yield_kg_ha": "yield"
    },
    inplace=True
)

# Recent dataset doesn't have these fields
recent_clean["Season"] = "Unknown"
recent_clean["area"] = None


# ==============================
# Make column order identical
# ==============================

columns = [
    "crop",
    "year",
    "Season",
    "state",
    "area",
    "rainfall_mm",
    "temperature_C",
    "yield"
]

historical_clean = historical_clean[columns]
recent_clean = recent_clean[columns]


# ==============================
# Combine
# ==============================

combined = pd.concat(
    [historical_clean, recent_clean],
    ignore_index=True
)


# ==============================
# Remove rows without target
# ==============================

before = len(combined)

combined = combined.dropna(
    subset=["yield"]
)

after = len(combined)

print(f"Rows before removing missing yield: {before}")
print(f"Rows after removing missing yield: {after}")
print(f"Rows removed: {before - after}")


# ==============================
# Clean text columns
# ==============================

combined["crop"] = combined["crop"].astype(str).str.strip()
combined["state"] = combined["state"].astype(str).str.strip()


# ==============================
# Save
# ==============================

os.makedirs(
    os.path.dirname(output_file),
    exist_ok=True
)

combined.to_csv(
    output_file,
    index=False
)


# ==============================
# Final information
# ==============================

print("\nSUCCESS!")
print("Saved:", output_file)
print("Final shape:", combined.shape)

print("\nColumns:")
print(combined.columns.tolist())

print("\nYears:")
print(combined["year"].min(), "to", combined["year"].max())

print("\nMissing values:")
print(combined.isna().sum())