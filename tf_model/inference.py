#!/usr/bin/env python3
"""
YOLOv11 Segmentation Inference Script
====================================

This script runs inference using your trained YOLOv11 segmentation model.

Usage:
    python inference.py --model path/to/model.pt --source path/to/image_or_folder
    python inference.py --model runs/seg_y11n_tx3/weights/best.pt --source dataset/test/images/
    python inference.py  # Uses default settings

Features:
    - Single image or batch processing
    - Automatic result saving
    - Confidence threshold control
    - Visualization options
"""

import os
import sys
import argparse
from pathlib import Path
import time

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

def run_inference(model_path, source_path, conf_threshold=0.25, save_results=True, 
                 show_labels=True, show_conf=True, project="runs/segment", name="predict"):
    """
    Run YOLOv11 segmentation inference.
    
    Args:
        model_path (str): Path to trained model (.pt file)
        source_path (str): Path to image, folder, or video
        conf_threshold (float): Confidence threshold (0-1)
        save_results (bool): Whether to save results
        show_labels (bool): Show class labels on results
        show_conf (bool): Show confidence scores on results
        project (str): Project directory for saving results
        name (str): Name of the run
    """
    
    from ultralytics import YOLO
    
    # Load model
    print(f"🤖 Loading model: {model_path}")
    model = YOLO(model_path)
    
    # Verify source exists
    source = Path(source_path)
    if not source.exists():
        raise FileNotFoundError(f"Source not found: {source}")
    
    print(f"📁 Source: {source}")
    print(f"🎯 Confidence threshold: {conf_threshold}")
    print(f"💾 Save results: {save_results}")
    
    # Run inference
    print("🚀 Running inference...")
    start_time = time.time()
    
    results = model.predict(
        source=str(source),
        conf=conf_threshold,
        save=save_results,
        show_labels=show_labels,
        show_conf=show_conf,
        project=project,
        name=name,
        exist_ok=True
    )
    
    end_time = time.time()
    inference_time = end_time - start_time
    
    # Process results
    total_detections = 0
    for result in results:
        if result.masks is not None:
            total_detections += len(result.masks)
    
    print(f"\n✅ Inference completed!")
    print(f"⏱️  Time taken: {inference_time:.2f} seconds")
    print(f"🎯 Total detections: {total_detections}")
    
    if save_results:
        output_dir = Path(project) / name
        print(f"📁 Results saved to: {output_dir.absolute()}")
        
        # List saved files
        if output_dir.exists():
            saved_files = list(output_dir.glob("*"))
            print(f"📄 Files generated: {len(saved_files)}")
            for file in saved_files[:10]:  # Show first 10 files
                print(f"   📷 {file.name}")
            if len(saved_files) > 10:
                print(f"   ... and {len(saved_files) - 10} more files")
    
    return results

def main():
    """Main function with command line interface."""
    parser = argparse.ArgumentParser(description='YOLOv11 Segmentation Inference')
    
    parser.add_argument('--model', '-m', 
                       default='runs/seg_y11n_tx3/weights/best.pt',
                       help='Path to model file (default: runs/seg_y11n_tx3/weights/best.pt)')
    
    parser.add_argument('--source', '-s',
                       default='dataset/test/images',
                       help='Path to source (image, folder, video, or webcam)')
    
    parser.add_argument('--conf', '-c', type=float, default=0.25,
                       help='Confidence threshold (default: 0.25)')
    
    parser.add_argument('--project', '-p', default='runs/segment',
                       help='Project directory (default: runs/segment)')
    
    parser.add_argument('--name', '-n', default='predict',
                       help='Run name (default: predict)')
    
    parser.add_argument('--no-save', action='store_true',
                       help='Do not save results')
    
    parser.add_argument('--no-labels', action='store_true',
                       help='Do not show labels on results')
    
    parser.add_argument('--no-conf', action='store_true',
                       help='Do not show confidence scores')
    
    parser.add_argument('--color', default='red',
                       choices=['red', 'blue', 'green', 'yellow', 'purple', 'orange'],
                       help='Color for annotations (default: red)')
    
    args = parser.parse_args()
    
    print("🔍 YOLOv11 Segmentation Inference")
    print("=" * 35)
    
    # Setup environment
    if not setup_environment():
        return
    
    # Validate model path
    model_path = Path(args.model)
    if not model_path.exists():
        print(f"❌ Model not found: {model_path}")
        print("   Available models in runs/:")
        runs_dir = Path("runs")
        if runs_dir.exists():
            for run_dir in runs_dir.iterdir():
                if run_dir.is_dir():
                    weights_dir = run_dir / "weights"
                    if weights_dir.exists():
                        for weight_file in weights_dir.glob("*.pt"):
                            print(f"     📄 {run_dir.name}/weights/{weight_file.name}")
        return
    
    # Validate source path
    source_path = Path(args.source)
    if not source_path.exists():
        print(f"❌ Source not found: {source_path}")
        print("   Available test images:")
        test_images = Path("dataset/test/images")
        if test_images.exists():
            for img in test_images.glob("*"):
                if img.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp']:
                    print(f"     🖼️  {img.name}")
        return
    
    try:
        # Run inference
        results = run_inference(
            model_path=str(model_path),
            source_path=str(source_path),
            conf_threshold=args.conf,
            save_results=not args.no_save,
            show_labels=not args.no_labels,
            show_conf=not args.no_conf,
            project=args.project,
            name=args.name
        )
        
        print("\n🎉 Inference completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Inference failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()