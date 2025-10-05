#!/usr/bin/env python3
"""
Masked Dataset Generator for Sample Thermal Images
=================================================

This script processes images from the "Sample Thermal Images" folder structure
and creates a masked dataset while preserving the faulty/normal classification.

Input structure:
    Sample Thermal Images/
    ├── T1/
    │   ├── faulty/    # T1_faulty_001.jpg, T1_faulty_002.jpg, ...
    │   └── normal/    # T1_normal_001.jpg, T1_normal_002.jpg, ...
    ├── T2/
    │   ├── faulty/
    │   └── normal/
    └── ... (T3-T13)

Output structure:
    masked_dataset/
    ├── faulty/        # All faulty transformer masks
    └── normal/        # All normal transformer masks

Usage:
    python create_masked_dataset.py
    python create_masked_dataset.py --output custom_masked_dataset
    python create_masked_dataset.py --conf 0.3 --mask-type isolated
"""

import os
import sys
import argparse
import cv2
import numpy as np
from pathlib import Path
import shutil

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

def create_masked_dataset_structure(base_dir="masked_dataset"):
    """Create the output directory structure for masked dataset."""
    base_path = Path(base_dir)
    
    directories = {
        'faulty': base_path / 'faulty',
        'normal': base_path / 'normal'
    }
    
    for dir_path in directories.values():
        dir_path.mkdir(parents=True, exist_ok=True)
    
    return directories

def scan_thermal_images_structure(source_dir="Sample Thermal Images"):
    """Scan and organize the thermal images structure."""
    source_path = Path(source_dir)
    
    if not source_path.exists():
        raise FileNotFoundError(f"Source directory not found: {source_path}")
    
    image_structure = {
        'faulty': [],
        'normal': []
    }
    
    # Scan all transformer folders (T1, T2, ..., T13)
    transformer_folders = sorted([d for d in source_path.iterdir() 
                                if d.is_dir() and d.name.startswith('T')])
    
    print(f"📁 Found {len(transformer_folders)} transformer folders")
    
    for transformer_folder in transformer_folders:
        transformer_name = transformer_folder.name
        print(f"   📂 Scanning {transformer_name}/")
        
        # Check faulty and normal subfolders
        for category in ['faulty', 'normal']:
            category_folder = transformer_folder / category
            
            if category_folder.exists():
                # Find all image files
                image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
                images = []
                
                for ext in image_extensions:
                    images.extend(category_folder.glob(f"*{ext}"))
                    images.extend(category_folder.glob(f"*{ext.upper()}"))
                
                if images:
                    print(f"      📷 {category}: {len(images)} images")
                    image_structure[category].extend(images)
                else:
                    print(f"      ⚠️  {category}: No images found")
            else:
                print(f"      ❌ {category}: Folder not found")
    
    total_faulty = len(image_structure['faulty'])
    total_normal = len(image_structure['normal'])
    
    print(f"\n📊 Total images found:")
    print(f"   🔴 Faulty: {total_faulty}")
    print(f"   🟢 Normal: {total_normal}")
    print(f"   📷 Total: {total_faulty + total_normal}")
    
    return image_structure

def process_image_to_mask(model, image_path, conf_threshold=0.25, mask_type="isolated"):
    """
    Process a single image and return the masked version.
    
    Args:
        model: YOLO model
        image_path: Path to input image
        conf_threshold: Confidence threshold
        mask_type: Type of mask to generate ('isolated', 'binary', 'masked_white')
    
    Returns:
        numpy array: Processed image or None if no segmentation found
    """
    
    # Run inference
    results = model.predict(source=str(image_path), conf=conf_threshold, save=False, verbose=False)
    
    for result in results:
        original_img = result.orig_img.copy()
        height, width = original_img.shape[:2]
        
        if result.masks is not None:
            # Combine all masks
            masks = result.masks.data.cpu().numpy()
            combined_mask = np.zeros((height, width), dtype=np.uint8)
            
            for mask in masks:
                # Resize mask to original image size
                mask_resized = cv2.resize(mask, (width, height))
                mask_binary = (mask_resized > 0.5).astype(np.uint8)
                combined_mask = np.maximum(combined_mask, mask_binary)
            
            # Generate different mask types
            if mask_type == "isolated":
                # Objects on black background
                masked_img = original_img.copy()
                masked_img[combined_mask == 0] = [0, 0, 0]
                return masked_img
                
            elif mask_type == "masked_white":
                # Objects with white background
                masked_img = original_img.copy()
                masked_img[combined_mask == 0] = [255, 255, 255]
                return masked_img
                
            elif mask_type == "binary":
                # Pure binary mask
                return (combined_mask * 255).astype(np.uint8)
                
            else:
                # Default: isolated
                masked_img = original_img.copy()
                masked_img[combined_mask == 0] = [0, 0, 0]
                return masked_img
        
        else:
            # No segmentation found - return None or original based on preference
            return None

def create_masked_dataset(source_dir="Sample Thermal Images", 
                         output_dir="masked_dataset",
                         model_path="runs/seg_y11n_tx3/weights/best.pt",
                         conf_threshold=0.25,
                         mask_type="isolated",
                         skip_no_detection=True):
    """
    Create masked dataset from Sample Thermal Images.
    
    Args:
        source_dir: Source directory with thermal images
        output_dir: Output directory for masked dataset
        model_path: Path to trained YOLO model
        conf_threshold: Confidence threshold for detection
        mask_type: Type of mask ('isolated', 'masked_white', 'binary')
        skip_no_detection: Skip images with no detections if True
    
    Returns:
        dict: Processing statistics
    """
    
    from ultralytics import YOLO
    
    # Load model
    print(f"🤖 Loading model: {model_path}")
    model = YOLO(model_path)
    
    # Create output structure
    print(f"📁 Creating masked dataset structure: {output_dir}")
    output_dirs = create_masked_dataset_structure(output_dir)
    
    # Scan source images
    print(f"🔍 Scanning source directory: {source_dir}")
    image_structure = scan_thermal_images_structure(source_dir)
    
    # Processing statistics
    stats = {
        'total_processed': 0,
        'faulty_processed': 0,
        'normal_processed': 0,
        'faulty_detected': 0,
        'normal_detected': 0,
        'faulty_skipped': 0,
        'normal_skipped': 0,
        'errors': 0
    }
    
    # Process each category
    for category in ['faulty', 'normal']:
        images = image_structure[category]
        output_category_dir = output_dirs[category]
        
        print(f"\n🚀 Processing {category} images ({len(images)} total)")
        print("-" * 50)
        
        for i, image_path in enumerate(images):
            try:
                print(f"[{i+1}/{len(images)}] Processing: {image_path.name}")
                
                # Process image
                masked_img = process_image_to_mask(
                    model, image_path, conf_threshold, mask_type
                )
                
                if masked_img is not None:
                    # Save masked image
                    output_filename = f"{image_path.stem}_masked{image_path.suffix}"
                    output_path = output_category_dir / output_filename
                    
                    # Choose appropriate save method based on mask type
                    if mask_type == "binary":
                        cv2.imwrite(str(output_path), masked_img)
                    else:
                        cv2.imwrite(str(output_path), masked_img)
                    
                    print(f"   ✅ Saved: {output_filename}")
                    
                    stats[f'{category}_detected'] += 1
                    
                else:
                    if skip_no_detection:
                        print(f"   ⚠️  No detection - Skipped")
                        stats[f'{category}_skipped'] += 1
                    else:
                        # Save original image if no detection
                        output_filename = f"{image_path.stem}_original{image_path.suffix}"
                        output_path = output_category_dir / output_filename
                        shutil.copy2(image_path, output_path)
                        print(f"   📋 No detection - Saved original: {output_filename}")
                        stats[f'{category}_skipped'] += 1
                
                stats['total_processed'] += 1
                stats[f'{category}_processed'] += 1
                
            except Exception as e:
                print(f"   ❌ Error processing {image_path.name}: {e}")
                stats['errors'] += 1
                continue
    
    return stats

def main():
    """Main function with command line interface."""
    parser = argparse.ArgumentParser(description='Create Masked Dataset from Sample Thermal Images')
    
    parser.add_argument('--source', '-s', 
                       default='Sample Thermal Images',
                       help='Source directory (default: Sample Thermal Images)')
    
    parser.add_argument('--output', '-o',
                       default='masked_dataset',
                       help='Output directory (default: masked_dataset)')
    
    parser.add_argument('--model', '-m',
                       default='runs/seg_y11n_tx3/weights/best.pt',
                       help='Path to YOLO model (default: runs/seg_y11n_tx3/weights/best.pt)')
    
    parser.add_argument('--conf', '-c', type=float, default=0.25,
                       help='Confidence threshold (default: 0.25)')
    
    parser.add_argument('--mask-type', '-t',
                       choices=['isolated', 'masked_white', 'binary'],
                       default='isolated',
                       help='Type of mask to generate (default: isolated)')
    
    parser.add_argument('--keep-no-detection', action='store_true',
                       help='Keep images with no detections as originals')
    
    args = parser.parse_args()
    
    print("🎭 Masked Dataset Generator")
    print("=" * 30)
    print(f"📁 Source: {args.source}")
    print(f"📂 Output: {args.output}")
    print(f"🤖 Model: {args.model}")
    print(f"🎯 Confidence: {args.conf}")
    print(f"🎨 Mask Type: {args.mask_type}")
    print(f"📋 Keep No Detection: {not args.keep_no_detection}")
    
    # Setup environment
    if not setup_environment():
        return
    
    # Validate paths
    if not Path(args.source).exists():
        print(f"❌ Source directory not found: {args.source}")
        return
    
    if not Path(args.model).exists():
        print(f"❌ Model not found: {args.model}")
        return
    
    try:
        # Create masked dataset
        stats = create_masked_dataset(
            source_dir=args.source,
            output_dir=args.output,
            model_path=args.model,
            conf_threshold=args.conf,
            mask_type=args.mask_type,
            skip_no_detection=not args.keep_no_detection
        )
        
        # Print final statistics
        print(f"\n📊 Processing Complete!")
        print("=" * 25)
        print(f"📷 Total Processed: {stats['total_processed']}")
        print(f"🔴 Faulty Images:")
        print(f"   📥 Processed: {stats['faulty_processed']}")
        print(f"   ✅ Detected: {stats['faulty_detected']}")
        print(f"   ⚠️  Skipped: {stats['faulty_skipped']}")
        print(f"🟢 Normal Images:")
        print(f"   📥 Processed: {stats['normal_processed']}")
        print(f"   ✅ Detected: {stats['normal_detected']}")
        print(f"   ⚠️  Skipped: {stats['normal_skipped']}")
        print(f"❌ Errors: {stats['errors']}")
        
        print(f"\n📁 Dataset created at: {Path(args.output).absolute()}")
        print(f"   📂 faulty/  - {stats['faulty_detected']} masked images")
        print(f"   📂 normal/  - {stats['normal_detected']} masked images")
        
        if stats['faulty_detected'] + stats['normal_detected'] > 0:
            print(f"\n🎉 Masked dataset creation completed successfully!")
        else:
            print(f"\n⚠️  No detections found. Check your model and confidence threshold.")
            
    except Exception as e:
        print(f"\n❌ Dataset creation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()