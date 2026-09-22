import os
import json
import tensorflow as tf
from tensorflow.keras import layers, models

# =========================
# 1. Dataset path
# =========================

DATASET_PATH = os.path.join(
    "ml",
    "datasets",
    "plantvillage",
    "PlantVillage",
    "train"
)

MODEL_DIR = os.path.join("ml", "models", "plant_disease")
MODEL_PATH = os.path.join(MODEL_DIR, "disease_model.keras")
CLASS_PATH = os.path.join(MODEL_DIR, "class_names.json")

os.makedirs(MODEL_DIR, exist_ok=True)

# =========================
# 2. Settings
# =========================

IMAGE_SIZE = (128, 128)
BATCH_SIZE = 32
SEED = 42
EPOCHS = 10

# =========================
# 3. Load dataset
# =========================

print("Loading dataset...")

train_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET_PATH,
    validation_split=0.2,
    subset="training",
    seed=SEED,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET_PATH,
    validation_split=0.2,
    subset="validation",
    seed=SEED,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE
)

class_names = train_ds.class_names

print("\nClasses:")
for i, name in enumerate(class_names):
    print(i, ":", name)

print("\nNumber of classes:", len(class_names))

# =========================
# 4. Save class names
# =========================

with open(CLASS_PATH, "w", encoding="utf-8") as f:
    json.dump(class_names, f, indent=2)

# =========================
# 5. Improve performance
# =========================

AUTOTUNE = tf.data.AUTOTUNE

train_ds = train_ds.cache().shuffle(1000).prefetch(AUTOTUNE)
val_ds = val_ds.cache().prefetch(AUTOTUNE)

# =========================
# 6. Data augmentation
# =========================

data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.1)
])

# =========================
# 7. CNN model
# =========================

model = models.Sequential([
    layers.Input(shape=(128, 128, 3)),

    data_augmentation,

    layers.Rescaling(1.0 / 255),

    layers.Conv2D(32, 3, activation="relu"),
    layers.MaxPooling2D(),

    layers.Conv2D(64, 3, activation="relu"),
    layers.MaxPooling2D(),

    layers.Conv2D(128, 3, activation="relu"),
    layers.MaxPooling2D(),

    layers.Flatten(),

    layers.Dense(128, activation="relu"),
    layers.Dropout(0.4),

    layers.Dense(len(class_names), activation="softmax")
])

# =========================
# 8. Compile
# =========================

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# =========================
# 9. Train
# =========================

print("\nStarting training...\n")

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS
)

# =========================
# 10. Evaluate
# =========================

loss, accuracy = model.evaluate(val_ds)

print("\n==============================")
print("Disease Model Training Done")
print("==============================")
print("Validation Accuracy:", round(accuracy * 100, 2), "%")
print("Validation Loss:", round(loss, 4))

# =========================
# 11. Save model
# =========================

model.save(MODEL_PATH)

print("\nModel saved:")
print(MODEL_PATH)

print("\nClass names saved:")
print(CLASS_PATH)