from pathlib import Path
import json
import shutil
from datasets import load_dataset

# Project paths
ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "ml" / "datasets" / "disease"

DATASETS = {
    "rice": "Project-AgML/rice_leaf_disease_classification_india",
    "chilli": "Project-AgML/COLD_chili_leaf_disease_classification",
    "maize": "Project-AgML/corn_maize_leaf_disease",
    "groundnut": "Project-AgML/groundnut_leaf_disease_classification",
    "cotton": "Project-AgML/cotton_leaf_disease_classification",
}

# 70% train / 15% validation / 15% test
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15


def save_image(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)

    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    image.save(path, format="JPEG", quality=95)


def prepare_crop(crop, dataset_id):
    print(f"\n{'=' * 60}")
    print(f"Preparing: {crop}")
    print(f"Dataset: {dataset_id}")
    print(f"{'=' * 60}")

    ds = load_dataset(
        dataset_id,
        split="train",
    )

    labels = ds.features["label"].names

    print(f"Images: {len(ds)}")
    print(f"Classes: {labels}")

    # Create deterministic split
    split1 = ds.train_test_split(
        test_size=0.30,
        seed=42,
        stratify_by_column="label",
    )

    train_ds = split1["train"]
    remaining_ds = split1["test"]

    split2 = remaining_ds.train_test_split(
        test_size=0.50,
        seed=42,
        stratify_by_column="label",
    )

    val_ds = split2["train"]
    test_ds = split2["test"]

    splits = {
        "train": train_ds,
        "val": val_ds,
        "test": test_ds,
    }

    crop_output = OUTPUT / crop

    # Remove previous prepared data only.
    # The Hugging Face cache remains untouched.
    if crop_output.exists():
        shutil.rmtree(crop_output)

    crop_output.mkdir(parents=True, exist_ok=True)

    manifest = {
        "crop": crop,
        "dataset": dataset_id,
        "seed": 42,
        "split": {
            "train": len(train_ds),
            "validation": len(val_ds),
            "test": len(test_ds),
        },
        "classes": labels,
    }

    for split_name, split_ds in splits.items():
        print(f"\n{split_name}: {len(split_ds)} images")

        class_counts = {}

        for index, item in enumerate(split_ds):
            image = item["image"]
            label_id = item["label"]
            label_name = labels[label_id]

            safe_label = label_name.replace("/", "_").replace("\\", "_")

            output_path = (
                crop_output
                / split_name
                / safe_label
                / f"{crop}_{split_name}_{index:05d}.jpg"
            )

            save_image(image, output_path)

            class_counts[label_name] = class_counts.get(label_name, 0) + 1

        manifest[f"{split_name}_classes"] = class_counts

    with open(crop_output / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\nCompleted: {crop}")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for crop, dataset_id in DATASETS.items():
        prepare_crop(crop, dataset_id)

    print("\n" + "=" * 60)
    print("ALL 5 DISEASE DATASETS PREPARED")
    print("=" * 60)
    print(f"Location: {OUTPUT}")
    print("Split: 70% train / 15% validation / 15% test")


if __name__ == "__main__":
    main()