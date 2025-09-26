# YOLO Label Validation and Visualization Script
# This script helps validate the generated YOLO labels by visualizing them

import cv2
import numpy as np
import os
import matplotlib.pyplot as plt
from pathlib import Path
import yaml

# Class colors for visualization (RGB)
CLASS_COLORS = {
    0: (255, 0, 0),      # Loose Joint (Faulty) - Red
    1: (255, 165, 0),    # Loose Joint (Potential) - Orange  
    2: (255, 0, 255),    # Point Overload (Faulty) - Magenta
    3: (255, 255, 0),    # Point Overload (Potential) - Yellow
    4: (0, 255, 255),    # Full Wire Overload (Potential) - Cyan
    5: (128, 0, 128),    # Hotspot (Review) - Purple
    6: (0, 255, 0),      # Warm Area (Likely Normal) - Green
}

def load_class_names(classes_file):
    """Load class names from classes.txt file"""
    class_names = []
    with open(classes_file, 'r') as f:
        for line in f:
            class_names.append(line.strip())
    return class_names

def yolo_to_bbox(yolo_coords, img_width, img_height):
    """
    Convert YOLO format to bounding box coordinates
    
    Args:
        yolo_coords: (x_center, y_center, width, height) in normalized format
        img_width, img_height: Image dimensions
        
    Returns:
        (x1, y1, x2, y2) in pixel coordinates
    """
    x_center, y_center, width, height = yolo_coords
    
    # Convert to pixel coordinates
    x_center *= img_width
    y_center *= img_height
    width *= img_width
    height *= img_height
    
    # Calculate top-left and bottom-right coordinates
    x1 = int(x_center - width/2)
    y1 = int(y_center - height/2)
    x2 = int(x_center + width/2)
    y2 = int(y_center + height/2)
    
    return x1, y1, x2, y2

def visualize_labels(image_path, label_path, class_names, save_path=None):
    """
    Visualize YOLO labels on an image
    
    Args:
        image_path: Path to the image file
        label_path: Path to the corresponding label file
        class_names: List of class names
        save_path: Optional path to save the visualization
    """
    # Read image
    image = cv2.imread(str(image_path))
    if image is None:
        print(f"Could not load image: {image_path}")
        return None
        
    img_height, img_width = image.shape[:2]
    
    # Read labels if they exist
    if os.path.exists(label_path):
        with open(label_path, 'r') as f:
            labels = f.readlines()
    else:
        print(f"No label file found: {label_path}")
        labels = []
    
    # Draw bounding boxes
    for label in labels:
        parts = label.strip().split()
        if len(parts) != 5:
            continue
            
        class_id = int(parts[0])
        x_center = float(parts[1])
        y_center = float(parts[2])
        width = float(parts[3])
        height = float(parts[4])
        
        # Convert to pixel coordinates
        x1, y1, x2, y2 = yolo_to_bbox([x_center, y_center, width, height], img_width, img_height)
        
        # Get class info
        class_name = class_names[class_id] if class_id < len(class_names) else f"Class_{class_id}"
        color = CLASS_COLORS.get(class_id, (255, 255, 255))  # Default to white
        
        # Draw bounding box
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
        
        # Draw label background
        label_text = f"{class_id}: {class_name}"
        (text_width, text_height), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        
        cv2.rectangle(image, (x1, y1 - text_height - 10), (x1 + text_width, y1), color, -1)
        cv2.putText(image, label_text, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    
    # Save or display
    if save_path:
        cv2.imwrite(str(save_path), image)
        print(f"Saved visualization: {save_path}")
    
    return image

def validate_dataset(dataset_dir):
    """
    Validate the entire YOLO dataset
    
    Args:
        dataset_dir: Path to the YOLO dataset directory
    """
    print("🔍 Validating YOLO Dataset...")
    print("="*50)
    
    # Load configuration
    config_path = Path(dataset_dir) / "data.yaml"
    if not config_path.exists():
        print(f"❌ Config file not found: {config_path}")
        return
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Load class names
    classes_path = Path(dataset_dir) / "classes.txt"
    if not classes_path.exists():
        print(f"❌ Classes file not found: {classes_path}")
        return
    
    class_names = load_class_names(classes_path)
    print(f"📋 Loaded {len(class_names)} classes:")
    for i, name in enumerate(class_names):
        print(f"   {i}: {name}")
    
    # Check each split
    splits = ['train', 'val', 'test']
    total_images = 0
    total_labels = 0
    
    for split in splits:
        print(f"\n📁 Checking {split} split...")
        
        images_dir = Path(dataset_dir) / "images" / split
        labels_dir = Path(dataset_dir) / "labels" / split
        
        if not images_dir.exists():
            print(f"   ❌ Images directory not found: {images_dir}")
            continue
            
        if not labels_dir.exists():
            print(f"   ❌ Labels directory not found: {labels_dir}")
            continue
        
        # Count files
        image_files = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))
        label_files = list(labels_dir.glob("*.txt"))
        
        print(f"   📊 Found {len(image_files)} images, {len(label_files)} label files")
        
        # Check for missing labels
        missing_labels = []
        for img_file in image_files:
            label_file = labels_dir / f"{img_file.stem}.txt"
            if not label_file.exists():
                missing_labels.append(img_file.name)
        
        if missing_labels:
            print(f"   ⚠️  Missing labels for: {missing_labels}")
        else:
            print(f"   ✅ All images have corresponding labels")
        
        total_images += len(image_files)
        total_labels += len(label_files)
    
    print(f"\n📈 Dataset Summary:")
    print(f"   Total Images: {total_images}")
    print(f"   Total Label Files: {total_labels}")
    print(f"   Classes: {len(class_names)}")

def preview_random_samples(dataset_dir, num_samples=6):
    """
    Preview random samples from the dataset with their labels
    
    Args:
        dataset_dir: Path to the YOLO dataset directory
        num_samples: Number of random samples to preview
    """
    print(f"🖼️  Previewing {num_samples} random samples...")
    
    # Load class names
    classes_path = Path(dataset_dir) / "classes.txt"
    class_names = load_class_names(classes_path)
    
    # Collect all images
    all_images = []
    for split in ['train', 'val', 'test']:
        images_dir = Path(dataset_dir) / "images" / split
        if images_dir.exists():
            images = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))
            all_images.extend([(img, split) for img in images])
    
    # Randomly sample
    import random
    random.seed(42)
    samples = random.sample(all_images, min(num_samples, len(all_images)))
    
    # Create output directory
    preview_dir = Path(dataset_dir) / "label_previews"
    preview_dir.mkdir(exist_ok=True)
    
    # Visualize samples
    for i, (img_path, split) in enumerate(samples):
        print(f"   Processing sample {i+1}/{len(samples)}: {img_path.name} ({split})")
        
        # Find corresponding label file
        labels_dir = Path(dataset_dir) / "labels" / split
        label_path = labels_dir / f"{img_path.stem}.txt"
        
        # Create visualization
        save_path = preview_dir / f"sample_{i+1}_{img_path.stem}_preview.jpg"
        visualize_labels(img_path, label_path, class_names, save_path)
    
    print(f"✅ Previews saved to: {preview_dir}")

def analyze_class_distribution(dataset_dir):
    """
    Analyze the distribution of classes across the dataset
    
    Args:
        dataset_dir: Path to the YOLO dataset directory
    """
    print("📊 Analyzing class distribution...")
    
    # Load class names
    classes_path = Path(dataset_dir) / "classes.txt"
    class_names = load_class_names(classes_path)
    
    # Initialize counters
    class_counts = {i: 0 for i in range(len(class_names))}
    split_counts = {'train': {i: 0 for i in range(len(class_names))},
                   'val': {i: 0 for i in range(len(class_names))},
                   'test': {i: 0 for i in range(len(class_names))}}
    
    # Count labels in each split
    for split in ['train', 'val', 'test']:
        labels_dir = Path(dataset_dir) / "labels" / split
        if not labels_dir.exists():
            continue
            
        for label_file in labels_dir.glob("*.txt"):
            with open(label_file, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 1:
                        class_id = int(parts[0])
                        if class_id < len(class_names):
                            class_counts[class_id] += 1
                            split_counts[split][class_id] += 1
    
    # Print results
    print("\n🎯 Class Distribution:")
    print("-" * 60)
    print(f"{'Class ID':<8} {'Class Name':<30} {'Total':<8} {'Train':<8} {'Val':<6} {'Test':<6}")
    print("-" * 60)
    
    for class_id in range(len(class_names)):
        class_name = class_names[class_id][:28]  # Truncate long names
        total = class_counts[class_id]
        train = split_counts['train'][class_id]
        val = split_counts['val'][class_id]
        test = split_counts['test'][class_id]
        
        print(f"{class_id:<8} {class_name:<30} {total:<8} {train:<8} {val:<6} {test:<6}")
    
    print("-" * 60)
    total_objects = sum(class_counts.values())
    print(f"{'TOTAL':<8} {'':<30} {total_objects:<8} "
          f"{sum(split_counts['train'].values()):<8} "
          f"{sum(split_counts['val'].values()):<6} "
          f"{sum(split_counts['test'].values()):<6}")

def main():
    """Main validation and preview function"""
    
    dataset_dir = "yolo_dataset"
    
    if not os.path.exists(dataset_dir):
        print(f"❌ Dataset directory not found: {dataset_dir}")
        print("Please run yolo_thermal_detector.py first to generate the dataset")
        return
    
    print("🔬 YOLO Dataset Validation and Preview")
    print("="*50)
    
    # Validate dataset structure
    validate_dataset(dataset_dir)
    
    # Analyze class distribution
    analyze_class_distribution(dataset_dir)
    
    # Preview random samples
    preview_random_samples(dataset_dir, num_samples=9)
    
    print("\n✅ Validation complete!")
    print(f"📁 Check {dataset_dir}/label_previews/ for visual samples")

if __name__ == "__main__":
    main()