# Enhanced Thermal Anomaly Detection with YOLO Label Generation
# This script detects thermal anomalies and generates labels in YOLO format for training

import cv2
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import os, math, io, base64
from matplotlib import pyplot as plt
from datetime import datetime

# -----------------------------
# YOLO Class Definitions
# -----------------------------

# Define class mapping for YOLO training
CLASS_MAPPING = {
    "Loose Joint (Faulty)": 0,
    "Loose Joint (Potential)": 1, 
    "Point Overload (Faulty)": 2,
    "Point Overload (Potential)": 3,
    "Full Wire Overload (Potential)": 4,
    "Hotspot (Review)": 5,
    "Warm Area (Likely Normal)": 6
}

# Reverse mapping for reading
ID_TO_CLASS = {v: k for k, v in CLASS_MAPPING.items()}

# Class names file for YOLO
CLASS_NAMES = list(CLASS_MAPPING.keys())

def save_class_names(output_dir):
    """Save class names to classes.txt file for YOLO"""
    classes_path = os.path.join(output_dir, "classes.txt")
    with open(classes_path, 'w') as f:
        for class_name in CLASS_NAMES:
            f.write(f"{class_name}\n")
    return classes_path

# -----------------------------
# Utilities
# -----------------------------

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def convert_to_yolo_format(x, y, w, h, img_width, img_height):
    """
    Convert bounding box coordinates to YOLO format
    
    Args:
        x, y, w, h: Bounding box in pixel coordinates (top-left corner + width/height)
        img_width, img_height: Image dimensions
        
    Returns:
        x_center, y_center, width, height: Normalized YOLO coordinates (0-1)
    """
    # Calculate center coordinates
    x_center = (x + w/2) / img_width
    y_center = (y + h/2) / img_height
    
    # Normalize width and height
    norm_width = w / img_width
    norm_height = h / img_height
    
    # Ensure values are between 0 and 1
    x_center = max(0, min(1, x_center))
    y_center = max(0, min(1, y_center))
    norm_width = max(0, min(1, norm_width))
    norm_height = max(0, min(1, norm_height))
    
    return x_center, y_center, norm_width, norm_height

def save_yolo_labels(detections, img_width, img_height, label_path):
    """
    Save detections in YOLO format to a text file
    
    Args:
        detections: List of detection dictionaries
        img_width, img_height: Image dimensions
        label_path: Path to save the label file
    """
    with open(label_path, 'w') as f:
        for detection in detections:
            class_name = detection['label']
            if class_name not in CLASS_MAPPING:
                print(f"Warning: Unknown class '{class_name}', skipping...")
                continue
                
            class_id = CLASS_MAPPING[class_name]
            x, y, w, h = detection['x'], detection['y'], detection['w'], detection['h']
            
            # Convert to YOLO format
            x_center, y_center, norm_width, norm_height = convert_to_yolo_format(
                x, y, w, h, img_width, img_height
            )
            
            # Write to file: class_id x_center y_center width height
            f.write(f"{class_id} {x_center:.6f} {y_center:.6f} {norm_width:.6f} {norm_height:.6f}\n")

def pil_draw_box_with_label(pil_img, box, label, color=(255,0,0), width=3):
    draw = ImageDraw.Draw(pil_img)
    x1, y1, x2, y2 = box
    draw.rectangle([x1, y1, x2, y2], outline=color, width=width)
    # Draw label background
    text = label
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except:
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", 16)
        except:
            font = ImageFont.load_default()
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = 4
    bx1, by1 = x1, max(0, y1 - th - 2*pad)
    bx2, by2 = x1 + tw + 2*pad, by1 + th + 2*pad
    draw.rectangle([bx1, by1, bx2, by2], fill=(0,0,0))
    draw.text((bx1+pad, by1+pad), text, fill=(255,255,255), font=font)
    return pil_img

def compute_local_contrast(gray, mask):
    # Mean intensity in mask vs a dilated ring around it
    kern = np.ones((21,21), np.uint8)
    dil = cv2.dilate(mask, kern, iterations=1)
    ring = cv2.subtract(dil, mask)
    m_in = float(gray[mask>0].mean()) if np.any(mask>0) else 0.0
    m_out = float(gray[ring>0].mean()) if np.any(ring>0) else m_in+1e-6
    contrast = (m_in - m_out) / (m_out + 1e-6)
    return contrast, m_in, m_out

def shape_features(cnt):
    x,y,w,h = cv2.boundingRect(cnt)
    area = cv2.contourArea(cnt)
    perim = cv2.arcLength(cnt, True)
    aspect = w / (h+1e-6) if h>0 else 999.0
    # Fit ellipse if possible for elongation
    elong = 1.0
    if len(cnt) >= 5:
        try:
            ellipse = cv2.fitEllipse(cnt)
            (cx, cy), (MA, ma), angle = ellipse
            long_axis = max(MA, ma)
            short_axis = max(1e-6, min(MA, ma))
            elong = long_axis / short_axis
        except:
            elong = 1.0
    return (x,y,w,h,area,perim,aspect,elong)

def dominant_hue(hsv, mask):
    h = hsv[...,0][mask>0]
    if h.size == 0:
        return None, 0.0
    # Convert hue 0-179 to degrees for interpretability if needed
    hist = cv2.calcHist([h.astype(np.uint8)], [0], None, [180], [0,180])
    idx = int(np.argmax(hist))
    frac = float(hist[idx] / (h.size+1e-6))
    return idx, frac

def classify_hotspot(hsv, gray, cnt, mask):
    # Extract features
    x,y,w,h,area,perim,aspect,elong = shape_features(cnt)
    contrast, m_in, m_out = compute_local_contrast(gray, mask)
    hue, hue_frac = dominant_hue(hsv, mask)
    # Size proxies
    img_area = gray.shape[0] * gray.shape[1]
    area_ratio = area / img_area
    # Heuristics
    is_small = area_ratio < 0.01
    is_large = area_ratio >= 0.05
    strong_contrast = contrast > 0.25   # adjustable
    moderate_contrast = contrast > 0.12
    
    # Color grouping (rough):
    # yellow ≈ hue 20–35; orange/red ≈ hue 0–20 and 170–180 wrap
    is_red_orange = (hue is not None) and (hue <= 20 or hue >= 170)
    is_yellowish = (hue is not None) and (20 < hue <= 35)

    # Full-wire shape proxy: elongated and not too tall
    looks_like_wire = elong > 3.0 and (min(w,h) < 0.25*max(gray.shape))
    # Decision tree
    label = "Hotspot"
    if strong_contrast and is_red_orange:
        if is_small:
            label = "Point Overload (Faulty)"
        else:
            label = "Loose Joint (Faulty)"
    elif (strong_contrast or moderate_contrast) and is_yellowish:
        if is_small:
            label = "Point Overload (Potential)"
        else:
            label = "Loose Joint (Potential)"
    elif looks_like_wire and (is_red_orange or is_yellowish):
        label = "Full Wire Overload (Potential)"
    else:
        # fallback: if high contrast but unknown hue bucket
        if strong_contrast:
            label = "Hotspot (Review)"
        else:
            label = "Warm Area (Likely Normal)"
    return label, {
        "x": int(x), "y": int(y), "w": int(w), "h": int(h),
        "area_ratio": float(area_ratio),
        "contrast": float(contrast),
        "hue": int(hue) if hue is not None else -1,
        "elongation": float(elong)
    }

def detect_and_annotate(img_bgr):
    # Convert to HSV
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Hot color mask (yellow/orange/red) with decent brightness
    # NOTE: thermal palettes vary; these ranges are a starting point.
    masks = []
    # Red range (low hue)
    m1 = cv2.inRange(hsv, (0, 120, 180), (15, 255, 255))
    # Red range (wrap high hue)
    m2 = cv2.inRange(hsv, (170, 120, 150), (179, 255, 255))
    # Yellow range
    m3 = cv2.inRange(hsv, (18, 80, 160), (35, 255, 255))

    hot_mask = cv2.bitwise_or(cv2.bitwise_or(m1, m2), m3)
    # Clean up
    hot_mask = cv2.morphologyEx(hot_mask, cv2.MORPH_OPEN, np.ones((5,5), np.uint8))
    hot_mask = cv2.morphologyEx(hot_mask, cv2.MORPH_CLOSE, np.ones((7,7), np.uint8))

    # Find contours
    contours, _ = cv2.findContours(hot_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detections = []
    vis = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    for cnt in contours:
        if cv2.contourArea(cnt) < 80:  # ignore tiny specks
            continue
        mask = np.zeros(hot_mask.shape, dtype=np.uint8)
        cv2.drawContours(mask, [cnt], -1, 255, thickness=-1)
        label, meta = classify_hotspot(hsv, gray, cnt, mask)
        x,y,w,h = meta["x"], meta["y"], meta["w"], meta["h"]
        # Choose color by label
        col = (255,0,0)  # red fault default
        if "Potential" in label:
            col = (255,165,0)  # orange
        if "Likely Normal" in label or "Review" in label:
            col = (0,128,255)  # blue-ish for review/normal
        vis = pil_draw_box_with_label(vis, (x,y,x+w,y+h), label, color=col, width=3)
        meta["label"] = label
        detections.append(meta)

    return vis, detections

def create_yolo_dataset_structure(base_dir):
    """
    Create YOLO dataset directory structure
    
    Args:
        base_dir: Base directory for the dataset
        
    Returns:
        Dictionary with paths to different splits
    """
    dataset_structure = {
        'images': {
            'train': os.path.join(base_dir, 'images', 'train'),
            'val': os.path.join(base_dir, 'images', 'val'),
            'test': os.path.join(base_dir, 'images', 'test')
        },
        'labels': {
            'train': os.path.join(base_dir, 'labels', 'train'),
            'val': os.path.join(base_dir, 'labels', 'val'), 
            'test': os.path.join(base_dir, 'labels', 'test')
        }
    }
    
    # Create directories
    for split in dataset_structure['images']:
        ensure_dir(dataset_structure['images'][split])
        ensure_dir(dataset_structure['labels'][split])
    
    return dataset_structure

def create_yolo_config(dataset_dir, class_names):
    """
    Create YOLO configuration YAML file
    
    Args:
        dataset_dir: Path to dataset directory
        class_names: List of class names
    """
    config_content = f"""# YOLO Dataset Configuration for Thermal Anomaly Detection
# Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

# Dataset paths (relative to this config file)
path: {os.path.abspath(dataset_dir)}  # dataset root dir
train: images/train  # train images (relative to 'path')
val: images/val      # val images (relative to 'path')
test: images/test    # test images (relative to 'path')

# Number of classes
nc: {len(class_names)}

# Class names
names:
"""
    
    for i, class_name in enumerate(class_names):
        config_content += f"  {i}: '{class_name}'\n"
    
    config_path = os.path.join(dataset_dir, 'data.yaml')
    with open(config_path, 'w') as f:
        f.write(config_content)
    
    print(f"YOLO config saved to: {config_path}")
    return config_path

# -----------------------------
# Main Processing
# -----------------------------

def main():
    # Dataset paths - using relative paths that work from current directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_dir = os.path.join(script_dir, "dataset", "Sample_Thermal_Images")
    output_base_dir = os.path.join(script_dir, "yolo_dataset")
    
    # Create YOLO dataset structure
    ensure_dir(output_base_dir)
    dataset_structure = create_yolo_dataset_structure(output_base_dir)
    
    # Save class names
    classes_path = save_class_names(output_base_dir)
    print(f"Class names saved to: {classes_path}")
    
    # Create YOLO config
    config_path = create_yolo_config(output_base_dir, CLASS_NAMES)
    
    # Collect image paths
    faulty_images = []
    normal_images = []

    for transformer in os.listdir(dataset_dir):
        transformer_path = os.path.join(dataset_dir, transformer)
        if not os.path.isdir(transformer_path):
            continue
            
        for folder in os.listdir(transformer_path):
            folder_path = os.path.join(transformer_path, folder)
            if not os.path.isdir(folder_path):
                continue
                
            if folder == "faulty":
                for image_file in os.listdir(folder_path):
                    if image_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                        faulty_images.append(os.path.join(folder_path, image_file))
            elif folder == "normal":
                for image_file in os.listdir(folder_path):
                    if image_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                        normal_images.append(os.path.join(folder_path, image_file))

    print(f"Found {len(faulty_images)} faulty and {len(normal_images)} normal images.")

    # Process images and generate labels
    all_images = faulty_images + normal_images
    total_detections = 0
    
    # Simple split: 70% train, 20% val, 10% test
    np.random.seed(42)  # For reproducible splits
    np.random.shuffle(all_images)
    
    n_train = int(0.7 * len(all_images))
    n_val = int(0.2 * len(all_images))
    
    train_images = all_images[:n_train]
    val_images = all_images[n_train:n_train+n_val]
    test_images = all_images[n_train+n_val:]
    
    print(f"Dataset split: {len(train_images)} train, {len(val_images)} val, {len(test_images)} test")
    
    # Process each split
    splits = {
        'train': train_images,
        'val': val_images, 
        'test': test_images
    }
    
    all_rows = []
    
    for split_name, image_list in splits.items():
        print(f"\nProcessing {split_name} split ({len(image_list)} images)...")
        
        for img_path in image_list:
            if not os.path.exists(img_path):
                print(f"Warning: Image not found: {img_path}")
                continue
                
            try:
                # Load and process image
                bgr = cv2.imread(img_path)
                if bgr is None:
                    print(f"Warning: Could not load image: {img_path}")
                    continue
                    
                img_height, img_width = bgr.shape[:2]
                vis, detections = detect_and_annotate(bgr)
                
                # Get base filename
                base_name = os.path.splitext(os.path.basename(img_path))[0]
                
                # Copy image to appropriate split directory
                img_output_path = os.path.join(dataset_structure['images'][split_name], f"{base_name}.jpg")
                vis_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                vis_pil = Image.fromarray(vis_rgb)
                vis_pil.save(img_output_path, quality=95)
                
                # Save YOLO labels
                label_output_path = os.path.join(dataset_structure['labels'][split_name], f"{base_name}.txt")
                save_yolo_labels(detections, img_width, img_height, label_output_path)
                
                # Save annotated visualization
                vis_output_path = os.path.join(output_base_dir, 'visualizations', f"{base_name}_annotated.jpg")
                ensure_dir(os.path.dirname(vis_output_path))
                vis.save(vis_output_path, quality=95)
                
                # Collect statistics
                total_detections += len(detections)
                for detection in detections:
                    row = {
                        "image": os.path.basename(img_path),
                        "split": split_name,
                        **detection
                    }
                    all_rows.append(row)
                
                print(f"  Processed {base_name}: {len(detections)} detections")
                
            except Exception as e:
                print(f"Error processing {img_path}: {str(e)}")
                continue
    
    # Save detection statistics
    df = pd.DataFrame(all_rows)
    stats_path = os.path.join(output_base_dir, "detection_statistics.csv")
    df.to_csv(stats_path, index=False)
    
    # Print summary statistics
    print(f"\n=== Dataset Generation Complete ===")
    print(f"Total images processed: {len(all_images)}")
    print(f"Total detections: {total_detections}")
    print(f"Average detections per image: {total_detections/len(all_images):.2f}")
    
    print(f"\nClass distribution:")
    class_counts = df['label'].value_counts()
    for class_name, count in class_counts.items():
        class_id = CLASS_MAPPING.get(class_name, -1)
        print(f"  {class_id}: {class_name}: {count} detections")
    
    print(f"\nDataset saved to: {output_base_dir}")
    print(f"YOLO config: {config_path}")
    print(f"Statistics: {stats_path}")
    
    print(f"\n=== Next Steps ===")
    print(f"1. Review the generated labels in {output_base_dir}/visualizations/")
    print(f"2. Install YOLOv8: pip install ultralytics")
    print(f"3. Train the model:")
    print(f"   from ultralytics import YOLO")
    print(f"   model = YOLO('yolov8n.pt')  # or yolov8s.pt, yolov8m.pt")
    print(f"   model.train(data='{config_path}', epochs=100, imgsz=640)")

if __name__ == "__main__":
    main()