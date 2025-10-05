#!/usr/bin/env python3
"""
Binary Mask Generator for YOLOv11 Segmentation
==============================================

This script generates binary masks from YOLOv11 segmentation results and creates:
1. Binary mask images (black/white)
2. Masked original images (isolated objects)
3. Inverted masks (background isolation)

Usage:
    python generate_binary_masks.py --source path/to/images
    python generate_binary_masks.py --source dataset/test/images/
    python generate_binary_masks.py  # Uses default test images

Output structure:
    masked_images/
    ├── binary_masks/       # Pure black/white masks
    ├── isolated_objects/   # Objects isolated on black background
    ├── masked_originals/   # Original images with background removed
    └── inverted_masks/     # Background only (objects removed)
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

def create_output_directories(base_dir="masked_images"):
    """Create output directories for different mask types."""
    base_path = Path(base_dir)
    
    directories = {
        'binary_masks': base_path / 'binary_masks',
        'isolated_objects': base_path / 'isolated_objects', 
        'masked_originals': base_path / 'masked_originals',
        'inverted_masks': base_path / 'inverted_masks'
    }
    
    for dir_path in directories.values():
        dir_path.mkdir(parents=True, exist_ok=True)
    
    return directories

def generate_binary_masks(model_path, source_path, conf_threshold=0.25, 
                         output_base="masked_images", mask_dilation=0):
    """
    Generate binary masks and isolated images from segmentation results.
    
    Args:
        model_path (str): Path to trained YOLOv11 model
        source_path (str): Path to source images
        conf_threshold (float): Confidence threshold
        output_base (str): Base directory for outputs
        mask_dilation (int): Pixels to dilate mask (0 = no dilation)
    
    Returns:
        dict: Statistics about processed images
    """
    
    from ultralytics import YOLO
    
    # Load model
    print(f"🤖 Loading model: {model_path}")
    model = YOLO(model_path)
    
    # Create output directories
    print(f"📁 Creating output directories in: {output_base}")
    dirs = create_output_directories(output_base)
    
    # Get source images
    source = Path(source_path)
    if source.is_file():
        image_files = [source]
    elif source.is_dir():
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
        image_files = []
        for ext in image_extensions:
            image_files.extend(source.glob(f"*{ext}"))
            image_files.extend(source.glob(f"*{ext.upper()}"))
    else:
        raise FileNotFoundError(f"Source not found: {source}")
    
    if not image_files:
        print(f"❌ No images found in: {source}")
        return None
    
    print(f"📷 Found {len(image_files)} images to process")
    
    # Statistics
    stats = {
        'total_images': len(image_files),
        'processed': 0,
        'with_masks': 0,
        'without_masks': 0,
        'total_objects': 0
    }
    
    # Process each image
    for i, img_path in enumerate(image_files):
        print(f"\n🚀 Processing [{i+1}/{len(image_files)}]: {img_path.name}")
        
        try:
            # Run inference
            results = model.predict(source=str(img_path), conf=conf_threshold, save=False, verbose=False)
            
            for result in results:
                # Load original image
                original_img = result.orig_img.copy()
                height, width = original_img.shape[:2]
                
                # Get base filename
                base_name = img_path.stem
                
                if result.masks is not None:
                    masks = result.masks.data.cpu().numpy()
                    print(f"   ✅ Found {len(masks)} segmentation(s)")
                    
                    # Combine all masks for this image
                    combined_mask = np.zeros((height, width), dtype=np.uint8)
                    
                    for j, mask in enumerate(masks):
                        # Resize mask to original image size
                        mask_resized = cv2.resize(mask, (width, height))
                        mask_binary = (mask_resized > 0.5).astype(np.uint8)
                        
                        # Add to combined mask
                        combined_mask = np.maximum(combined_mask, mask_binary)
                        
                        # Save individual mask if multiple objects
                        if len(masks) > 1:
                            individual_mask = mask_binary * 255
                            
                            # Apply dilation if specified
                            if mask_dilation > 0:
                                kernel = np.ones((mask_dilation, mask_dilation), np.uint8)
                                individual_mask = cv2.dilate(individual_mask, kernel, iterations=1)
                            
                            mask_filename = f"{base_name}_mask_{j+1}.png"
                            mask_path = dirs['binary_masks'] / mask_filename
                            cv2.imwrite(str(mask_path), individual_mask)
                    
                    # Convert combined mask to 255 (white) for foreground
                    combined_mask_255 = combined_mask * 255
                    
                    # Apply dilation to combined mask if specified
                    if mask_dilation > 0:
                        kernel = np.ones((mask_dilation, mask_dilation), np.uint8)
                        combined_mask_255 = cv2.dilate(combined_mask_255, kernel, iterations=1)
                        combined_mask = combined_mask_255 // 255
                    
                    # 1. Save binary mask (black background, white objects)
                    binary_mask_path = dirs['binary_masks'] / f"{base_name}_binary_mask.png"
                    cv2.imwrite(str(binary_mask_path), combined_mask_255)
                    print(f"      💾 Binary mask: {binary_mask_path.name}")
                    
                    # 2. Save isolated objects (objects on black background)
                    isolated_img = original_img.copy()
                    isolated_img[combined_mask == 0] = [0, 0, 0]  # Black background
                    isolated_path = dirs['isolated_objects'] / f"{base_name}_isolated.jpg"
                    cv2.imwrite(str(isolated_path), isolated_img)
                    print(f"      💾 Isolated objects: {isolated_path.name}")
                    
                    # 3. Save masked original (transparent background or white)
                    # Create RGBA version for transparency
                    if original_img.shape[2] == 3:  # BGR to BGRA
                        masked_rgba = cv2.cvtColor(original_img, cv2.COLOR_BGR2BGRA)
                    else:
                        masked_rgba = original_img.copy()
                    
                    # Set alpha channel based on mask (0 = transparent, 255 = opaque)
                    if masked_rgba.shape[2] == 4:
                        masked_rgba[:, :, 3] = combined_mask_255
                        masked_rgba_path = dirs['masked_originals'] / f"{base_name}_masked.png"
                        cv2.imwrite(str(masked_rgba_path), masked_rgba)
                        print(f"      💾 Masked original (transparent): {masked_rgba_path.name}")
                    
                    # Also save with white background
                    masked_white = original_img.copy()
                    masked_white[combined_mask == 0] = [255, 255, 255]  # White background
                    masked_white_path = dirs['masked_originals'] / f"{base_name}_masked_white.jpg"
                    cv2.imwrite(str(masked_white_path), masked_white)
                    print(f"      💾 Masked original (white bg): {masked_white_path.name}")
                    
                    # 4. Save inverted mask (background only)
                    inverted_mask = 255 - combined_mask_255
                    inverted_path = dirs['inverted_masks'] / f"{base_name}_inverted_mask.png"
                    cv2.imwrite(str(inverted_path), inverted_mask)
                    
                    # Background only image
                    background_img = original_img.copy()
                    background_img[combined_mask == 1] = [0, 0, 0]  # Black out objects
                    background_path = dirs['inverted_masks'] / f"{base_name}_background_only.jpg"
                    cv2.imwrite(str(background_path), background_img)
                    print(f"      💾 Background only: {background_path.name}")
                    
                    stats['with_masks'] += 1
                    stats['total_objects'] += len(masks)
                    
                else:
                    print(f"   ❌ No segmentations found")
                    
                    # Create empty mask files for consistency
                    empty_mask = np.zeros((height, width), dtype=np.uint8)
                    empty_mask_path = dirs['binary_masks'] / f"{base_name}_binary_mask.png"
                    cv2.imwrite(str(empty_mask_path), empty_mask)
                    
                    stats['without_masks'] += 1
                
                stats['processed'] += 1
                
        except Exception as e:
            print(f"   ❌ Error processing {img_path.name}: {e}")
            continue
    
    return stats

def main():
    """Main function with command line interface."""
    parser = argparse.ArgumentParser(description='Generate Binary Masks from YOLOv11 Segmentation')
    
    parser.add_argument('--model', '-m',
                       default='runs/seg_y11n_tx3/weights/best.pt',
                       help='Path to YOLOv11 model (default: runs/seg_y11n_tx3/weights/best.pt)')
    
    parser.add_argument('--source', '-s',
                       default='dataset/test/images',
                       help='Source images path (default: dataset/test/images)')
    
    parser.add_argument('--conf', '-c', type=float, default=0.25,
                       help='Confidence threshold (default: 0.25)')
    
    parser.add_argument('--output', '-o', default='masked_images',
                       help='Output directory (default: masked_images)')
    
    parser.add_argument('--dilation', '-d', type=int, default=0,
                       help='Mask dilation in pixels (default: 0)')
    
    args = parser.parse_args()
    
    print("🎭 YOLOv11 Binary Mask Generator")
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
    
    print(f"🏗️  Model: {model_path}")
    print(f"📁 Source: {source_path}")
    print(f"📂 Output: {args.output}")
    print(f"🎯 Confidence: {args.conf}")
    if args.dilation > 0:
        print(f"🔍 Mask dilation: {args.dilation} pixels")
    
    try:
        # Generate masks
        stats = generate_binary_masks(
            model_path=str(model_path),
            source_path=str(source_path),
            conf_threshold=args.conf,
            output_base=args.output,
            mask_dilation=args.dilation
        )
        
        if stats:
            # Print summary
            print(f"\n📊 Processing Summary:")
            print(f"=" * 25)
            print(f"📷 Total images: {stats['total_images']}")
            print(f"✅ Processed: {stats['processed']}")
            print(f"🎭 With masks: {stats['with_masks']}")
            print(f"❌ Without masks: {stats['without_masks']}")
            print(f"🔍 Total objects found: {stats['total_objects']}")
            
            print(f"\n📁 Output structure:")
            print(f"   📂 {args.output}/")
            print(f"      ├── binary_masks/      # Black/white masks")
            print(f"      ├── isolated_objects/  # Objects on black background")  
            print(f"      ├── masked_originals/  # Original with background removed")
            print(f"      └── inverted_masks/    # Background only")
            
            print(f"\n🎉 Binary mask generation completed!")
            
        else:
            print(f"\n❌ No images were processed successfully")
            
    except Exception as e:
        print(f"\n❌ Generation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()