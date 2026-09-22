from pathlib import Path
import json
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = ROOT / "ml" / "datasets" / "disease"
MODEL_ROOT = ROOT / "ml" / "models" / "plant_disease"

IMG_SIZE = (128, 128)
BATCH_SIZE = 32
EPOCHS = 15
SEED = 42

CROPS = ["rice", "chilli", "maize", "groundnut", "cotton"]

MODEL_ROOT.mkdir(parents=True, exist_ok=True)


def create_model(num_classes):
    model = keras.Sequential([
        layers.Input(shape=(128, 128, 3)),

        layers.Rescaling(1.0 / 255),

        layers.Conv2D(32, 3, activation="relu"),
        layers.MaxPooling2D(),

        layers.Conv2D(64, 3, activation="relu"),
        layers.MaxPooling2D(),

        layers.Conv2D(128, 3, activation="relu"),
        layers.MaxPooling2D(),

        layers.Dropout(0.3),
        layers.Flatten(),

        layers.Dense(128, activation="relu"),
        layers.Dropout(0.4),

        layers.Dense(num_classes, activation="softmax")
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    return model


def load_data(crop):
    crop_path = DATA_ROOT / crop

    train = keras.utils.image_dataset_from_directory(
        crop_path / "train",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=True,
        seed=SEED
    )

    val = keras.utils.image_dataset_from_directory(
        crop_path / "val",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=False
    )

    test = keras.utils.image_dataset_from_directory(
        crop_path / "test",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=False
    )

    class_names = train.class_names

    # Improve input pipeline performance
    train = train.prefetch(tf.data.AUTOTUNE)
    val = val.prefetch(tf.data.AUTOTUNE)
    test = test.prefetch(tf.data.AUTOTUNE)

    return train, val, test, class_names


def train_crop(crop):
    print("\n" + "=" * 70)
    print(f"TRAINING: {crop.upper()}")
    print("=" * 70)

    train, val, test, class_names = load_data(crop)

    print("Classes:", class_names)

    model = create_model(len(class_names))

    model.summary()

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=4,
            restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            min_lr=1e-6
        )
    ]

    history = model.fit(
        train,
        validation_data=val,
        epochs=EPOCHS,
        callbacks=callbacks
    )

    print("\nEvaluating TEST set...")

    test_loss, test_accuracy = model.evaluate(test, verbose=1)

    print(f"TEST LOSS: {test_loss:.4f}")
    print(f"TEST ACCURACY: {test_accuracy * 100:.2f}%")

    model_path = MODEL_ROOT / f"{crop}_disease.keras"
    model.save(model_path)

    class_path = MODEL_ROOT / f"{crop}_classes.json"

    with open(class_path, "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)

    metrics = {
        "crop": crop,
        "classes": class_names,
        "test_loss": float(test_loss),
        "test_accuracy": float(test_accuracy),
        "epochs_configured": EPOCHS,
        "image_size": IMG_SIZE,
        "batch_size": BATCH_SIZE,
        "seed": SEED
    }

    metrics_path = MODEL_ROOT / f"{crop}_metrics.json"

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nMODEL SAVED: {model_path}")
    print(f"CLASSES SAVED: {class_path}")
    print(f"METRICS SAVED: {metrics_path}")


def main():
    print("TensorFlow:", tf.__version__)
    print("Starting disease model training...")

    for crop in CROPS:
        train_crop(crop)

    print("\n" + "=" * 70)
    print("ALL 5 DISEASE MODELS TRAINED")
    print("=" * 70)


if __name__ == "__main__":
    main()