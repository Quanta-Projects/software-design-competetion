#!/usr/bin/env python3
"""
YOLOv11 Inference with Custom Colors
===================================

This script allows you to customize the colors used in YOLOv11 inference,
including changing segmentation masks and bounding boxes to red or any other color.

Usage:
    python inference_custom_colors.py --source path/to/image.jpg --color red
    python inference_custom_colors.py --source dataset/test/images/ --color red
"""

import os
import sys
import argparse
import cv2
import numpy as np
from pathlib import Path

def setup_environment():
    """Setup environment for inference."""
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
    
    try:
        from ultralytics import YOLO
        return True
    except ImportError:
        print("❌ Ultralytics not found. Please install it:")
        print("   conda activate yolov11")
        print("   pip install ultralytics")
        return False

def get_color_rgb(color_name):
    """Convert color name to RGB values."""
    colors = {
        'red': (255, 0, 0),
        'green': (0, 255, 0),
        'blue': (0, 0, 255),
        'yellow': (255, 255, 0),
        'purple': (255, 0, 255),
        'cyan': (0, 255, 255),
        'orange': (255, 165, 0),
        'pink': (255, 192, 203),
        'lime': (0, 255, 0),
        'white': (255, 255, 255),
        'black': (0, 0, 0),
        'dark_red': (139, 0, 0),
        'bright_red': (255, 69, 0),
        'crimson': (220, 20, 60)
    }
    
    return colors.get(color_name.lower(), (255, 0, 0))  # Default to red

def run_inference_with_custom_colors(model_path, source_path, color='red', 
                                   conf_threshold=0.25, save_results=True,
                                   line_thickness=3, mask_alpha=0.3):
    """
    Run YOLOv11 inference with custom colors.
    
    Args:
        model_path (str): Path to trained model
        source_path (str): Path to source image/folder
        color (str): Color name for annotations
        conf_threshold (float): Confidence threshold
        save_results (bool): Whether to save results
        line_thickness (int): Thickness of bounding box lines
        mask_alpha (float): Transparency of segmentation masks (0-1)
    """
    
    from ultralytics import YOLO
    import matplotlib.pyplot as plt
    
    # Load model
    print(f"🤖 Loading model: {model_path}")
    model = YOLO(model_path)
    
    # Get color RGB values
    color_rgb = get_color_rgb(color)
    color_bgr = (color_rgb[2], color_rgb[1], color_rgb[0])  # Convert RGB to BGR for OpenCV
    
    print(f"🎨 Using color: {color} {color_rgb}")
    
    # Run inference
    print("🚀 Running inference with custom colors...")
    results = model.predict(
        source=source_path,
        conf=conf_threshold,
        save=False,  # We'll handle saving with custom colors
        verbose=True
    )
    
    # Process results and apply custom colors
    output_dir = Path("runs/segment/custom_colors")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    processed_count = 0
    
    for i, result in enumerate(results):
        # Get original image
        img = result.orig_img.copy()
        
        if result.masks is not None:
            # Apply custom colored masks
            masks = result.masks.data.cpu().numpy()
            boxes = result.boxes.xyxy.cpu().numpy()
            confidences = result.boxes.conf.cpu().numpy()
            
            # Create colored overlay
            overlay = img.copy()
            
            for j, (mask, box, conf) in enumerate(zip(masks, boxes, confidences)):
                # Resize mask to image size
                mask_resized = cv2.resize(mask, (img.shape[1], img.shape[0]))
                mask_bool = mask_resized > 0.5
                
                # Apply colored mask
                overlay[mask_bool] = color_bgr
                
                # Draw bounding box
                x1, y1, x2, y2 = map(int, box)
                cv2.rectangle(img, (x1, y1), (x2, y2), color_bgr, line_thickness)
                
                # Add confidence text
                text = f"Transformer: {conf:.2f}"
                text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                cv2.rectangle(img, (x1, y1 - text_size[1] - 10), 
                            (x1 + text_size[0], y1), color_bgr, -1)
                cv2.putText(img, text, (x1, y1 - 5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Blend overlay with original image
            img = cv2.addWeighted(img, 1 - mask_alpha, overlay, mask_alpha, 0)
        
        # Save result
        if save_results:
            # Get source filename
            if hasattr(result, 'path') and result.path:
                source_name = Path(result.path).stem
            else:
                source_name = f"result_{i}"
            
            output_path = output_dir / f"{source_name}_{color}_annotated.jpg"
            cv2.imwrite(str(output_path), img)
            print(f"💾 Saved: {output_path}")
            processed_count += 1
        
        # Also save using matplotlib for better quality
        if save_results:
            plt.figure(figsize=(12, 8))
            plt.imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            plt.axis('off')
            plt.title(f'YOLOv11 Segmentation - {color.title()} Color', fontsize=14, pad=20)
            
            output_path_plt = output_dir / f"{source_name}_{color}_matplotlib.jpg"
            plt.savefig(str(output_path_plt), bbox_inches='tight', dpi=300, 
                       facecolor='white', edgecolor='none')
            plt.close()
            print(f"🎨 High-quality saved: {output_path_plt}")
    
    print(f"\n✅ Processed {processed_count} images with {color} color")
    print(f"📁 Results saved to: {output_dir.absolute()}")
    
    return results

def main():
    """Main function with command line interface."""
    parser = argparse.ArgumentParser(description='YOLOv11 Inference with Custom Colors')
    
    parser.add_argument('--model', '-m', 
                       default='runs/seg_y11n_tx3/weights/best.pt',
                       help='Path to model file')
    
    parser.add_argument('--source', '-s',
                       default='dataset/test/images/T9_normal_001_jpg.rf.803f7685c22e3c3580a34e7982f91ac7.jpg',
                       help='Path to source image or folder')
    
    parser.add_argument('--color', '-c', default='red',
                       choices=['red', 'green', 'blue', 'yellow', 'purple', 'cyan', 
                               'orange', 'pink', 'lime', 'white', 'black', 'dark_red', 
                               'bright_red', 'crimson'],
                       help='Color for annotations (default: red)')
    
    parser.add_argument('--conf', type=float, default=0.25,
                       help='Confidence threshold (default: 0.25)')
    
    parser.add_argument('--line-thickness', type=int, default=3,
                       help='Thickness of bounding box lines (default: 3)')
    
    parser.add_argument('--mask-alpha', type=float, default=0.3,
                       help='Mask transparency (0-1, default: 0.3)')
    
    args = parser.parse_args()
    
    print("🎨 YOLOv11 Custom Color Inference")
    print("=" * 35)
    
    # Setup environment
    if not setup_environment():
        return
    
    # Validate paths
    model_path = Path(args.model)
    source_path = Path(args.source)
    
    if not model_path.exists():
        print(f"❌ Model not found: {model_path}")
        return
    
    if not source_path.exists():
        print(f"❌ Source not found: {source_path}")
        return
    
    try:
        # Run inference
        results = run_inference_with_custom_colors(
            model_path=str(model_path),
            source_path=str(source_path),
            color=args.color,
            conf_threshold=args.conf,
            line_thickness=args.line_thickness,
            mask_alpha=args.mask_alpha
        )
        
        print(f"\n🎉 Custom {args.color} inference completed!")
        print(f"📂 Check 'runs/segment/custom_colors/' for results")
        
    except Exception as e:
        print(f"\n❌ Inference failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()