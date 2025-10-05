#!/usr/bin/env python3
"""
Simple Red Color Inference Script
================================

This script runs YOLO inference and then recolors the output to red.
"""

import os
import cv2
import numpy as np
from pathlib import Path

# Fix OpenMP issue
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

def run_red_inference(source_image):
    """Run inference and recolor to red."""
    
    try:
        from ultralytics import YOLO
    except ImportError:
        print("❌ Please install ultralytics: pip install ultralytics")
        return
    
    # Load model
    model = YOLO('runs/seg_y11n_tx3/weights/best.pt')
    
    # Run inference
    print(f"🚀 Running inference on: {source_image}")
    results = model.predict(source=source_image, conf=0.25, save=False)
    
    # Process results
    for i, result in enumerate(results):
        # Get original image
        img = result.orig_img.copy()
        
        if result.masks is not None:
            print(f"✅ Found {len(result.masks)} segmentation(s)")
            
            # Get masks and boxes
            masks = result.masks.data.cpu().numpy()
            boxes = result.boxes.xyxy.cpu().numpy() if result.boxes is not None else []
            confidences = result.boxes.conf.cpu().numpy() if result.boxes is not None else []
            
            # Create red overlay
            overlay = img.copy()
            red_color = (0, 0, 255)  # BGR format for OpenCV
            
            for j, mask in enumerate(masks):
                # Resize mask to image dimensions
                mask_resized = cv2.resize(mask, (img.shape[1], img.shape[0]))
                mask_bool = mask_resized > 0.5
                
                # Apply red color to mask area
                overlay[mask_bool] = red_color
                
                # Draw red bounding box if available
                if j < len(boxes):
                    box = boxes[j]
                    conf = confidences[j] if j < len(confidences) else 0.0
                    
                    x1, y1, x2, y2 = map(int, box)
                    
                    # Draw red bounding box
                    cv2.rectangle(img, (x1, y1), (x2, y2), red_color, 3)
                    
                    # Add red background for text
                    text = f"Transformer: {conf:.2f}"
                    text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
                    cv2.rectangle(img, (x1, y1 - text_size[1] - 10), 
                                (x1 + text_size[0], y1), red_color, -1)
                    
                    # Add white text
                    cv2.putText(img, text, (x1, y1 - 5), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Blend original image with red overlay (30% transparency)
            final_img = cv2.addWeighted(img, 0.7, overlay, 0.3, 0)
            
            # Save result
            output_dir = Path("runs/segment/red_results")
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Get source filename
            source_path = Path(source_image)
            output_filename = f"{source_path.stem}_RED_segmented.jpg"
            output_path = output_dir / output_filename
            
            cv2.imwrite(str(output_path), final_img)
            print(f"💾 Red segmentation saved to: {output_path}")
            
            return str(output_path)
        else:
            print("❌ No segmentations found in image")
            return None

if __name__ == "__main__":
    # Test image
    test_image = "dataset/test/images/T9_normal_001_jpg.rf.803f7685c22e3c3580a34e7982f91ac7.jpg"
    
    if not os.path.exists(test_image):
        print(f"❌ Test image not found: {test_image}")
        print("Available test images:")
        test_dir = Path("dataset/test/images")
        if test_dir.exists():
            for img in test_dir.glob("*.jpg"):
                print(f"  📷 {img.name}")
    else:
        result_path = run_red_inference(test_image)
        if result_path:
            print(f"🎉 Red segmentation completed!")
            print(f"📂 Output: {result_path}")
        else:
            print("❌ Failed to create red segmentation")