#!/usr/bin/env python3
"""
Batch Red Segmentation Script
============================

Process all test images with red segmentation colors.
"""

import os
import cv2
import numpy as np
from pathlib import Path

# Fix OpenMP issue
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

def batch_red_inference(input_folder="dataset/test/images"):
    """Run red inference on all images in a folder."""
    
    try:
        from ultralytics import YOLO
    except ImportError:
        print("❌ Please install ultralytics: pip install ultralytics")
        return
    
    # Load model
    model = YOLO('runs/seg_y11n_tx3/weights/best.pt')
    
    # Get all image files
    input_path = Path(input_folder)
    if not input_path.exists():
        print(f"❌ Input folder not found: {input_path}")
        return
    
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
    image_files = []
    for ext in image_extensions:
        image_files.extend(input_path.glob(f"*{ext}"))
        image_files.extend(input_path.glob(f"*{ext.upper()}"))
    
    if not image_files:
        print(f"❌ No images found in: {input_path}")
        return
    
    print(f"📁 Found {len(image_files)} images to process")
    
    # Create output directory
    output_dir = Path("runs/segment/red_batch_results")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Process each image
    processed = 0
    failed = 0
    
    for img_path in image_files:
        try:
            print(f"\n🚀 Processing: {img_path.name}")
            
            # Run inference
            results = model.predict(source=str(img_path), conf=0.25, save=False)
            
            for result in results:
                img = result.orig_img.copy()
                
                if result.masks is not None:
                    print(f"   ✅ Found {len(result.masks)} segmentation(s)")
                    
                    # Get masks and boxes
                    masks = result.masks.data.cpu().numpy()
                    boxes = result.boxes.xyxy.cpu().numpy() if result.boxes is not None else []
                    confidences = result.boxes.conf.cpu().numpy() if result.boxes is not None else []
                    
                    # Create red overlay
                    overlay = img.copy()
                    red_color = (0, 0, 255)  # BGR format
                    
                    for j, mask in enumerate(masks):
                        # Resize mask to image dimensions
                        mask_resized = cv2.resize(mask, (img.shape[1], img.shape[0]))
                        mask_bool = mask_resized > 0.5
                        
                        # Apply red color
                        overlay[mask_bool] = red_color
                        
                        # Draw red bounding box
                        if j < len(boxes):
                            box = boxes[j]
                            conf = confidences[j] if j < len(confidences) else 0.0
                            
                            x1, y1, x2, y2 = map(int, box)
                            
                            # Red bounding box
                            cv2.rectangle(img, (x1, y1), (x2, y2), red_color, 3)
                            
                            # Red text background
                            text = f"Transformer: {conf:.2f}"
                            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
                            cv2.rectangle(img, (x1, y1 - text_size[1] - 10), 
                                        (x1 + text_size[0], y1), red_color, -1)
                            
                            # White text
                            cv2.putText(img, text, (x1, y1 - 5), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                    
                    # Blend with transparency
                    final_img = cv2.addWeighted(img, 0.7, overlay, 0.3, 0)
                    
                    # Save result
                    output_filename = f"{img_path.stem}_RED.jpg"
                    output_path = output_dir / output_filename
                    
                    cv2.imwrite(str(output_path), final_img)
                    print(f"   💾 Saved: {output_filename}")
                    processed += 1
                    
                else:
                    print(f"   ❌ No segmentations found")
                    failed += 1
                    
        except Exception as e:
            print(f"   ❌ Error processing {img_path.name}: {e}")
            failed += 1
    
    # Summary
    print(f"\n📊 Batch Processing Summary:")
    print(f"   ✅ Successfully processed: {processed}")
    print(f"   ❌ Failed: {failed}")
    print(f"   📁 Results saved to: {output_dir.absolute()}")
    
    return output_dir

if __name__ == "__main__":
    print("🔴 Batch Red Segmentation")
    print("=" * 30)
    
    result_dir = batch_red_inference()
    
    if result_dir and result_dir.exists():
        print(f"\n🎉 Batch processing completed!")
        print(f"📂 Check the results in: {result_dir}")
        
        # List generated files
        red_files = list(result_dir.glob("*_RED.jpg"))
        print(f"\n📋 Generated {len(red_files)} red segmentation files:")
        for file in red_files:
            print(f"   🔴 {file.name}")
    else:
        print("\n❌ Batch processing failed!")