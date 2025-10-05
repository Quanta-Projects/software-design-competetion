#!/usr/bin/env python3
"""
Quick Test Script for Two-Stage Defect Detection
===============================================

This script demonstrates the two-stage detection on a sample image.
"""

import os
import sys
from pathlib import Path

def find_sample_image():
    """Find a sample image to test with."""
    
    # Common sample image locations
    sample_paths = [
        "Sample Thermal Images/T1/normal/T1_normal_001.jpg",
        "Sample Thermal Images/T1/faulty/T1_faulty_001.jpg", 
        "Transformer Defects/test/images",
        "dataset/Sample_Thermal_Images"
    ]
    
    for path_str in sample_paths:
        path = Path(path_str)
        if path.exists():
            if path.is_file():
                return str(path)
            elif path.is_dir():
                # Find first image in directory
                image_files = list(path.glob("*.jpg")) + list(path.glob("*.png"))
                if image_files:
                    return str(image_files[0])
    
    return None

def main():
    """Run a quick test of the two-stage detection system."""
    
    print("🧪 Quick Test: Two-Stage Transformer Defect Detection")
    print("=" * 55)
    
    # Set environment
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
    
    # Check if we're in the right directory
    if not os.path.exists('two_stage_defect_detection.py'):
        print("❌ Please run this script from the tf_model directory")
        return
    
    # Find a sample image
    sample_image = find_sample_image()
    
    if not sample_image:
        print("❌ No sample images found. Available options:")
        print("   1. Add images to 'Sample Thermal Images' folder")
        print("   2. Specify image path manually")
        
        manual_path = input("Enter image path (or press Enter to skip): ").strip()
        if manual_path and os.path.exists(manual_path):
            sample_image = manual_path
        else:
            print("Exiting test...")
            return
    
    print(f"📷 Testing with image: {sample_image}")
    
    # Import and run the detector
    try:
        from two_stage_defect_detection import TwoStageDefectDetector, setup_environment
        
        # Setup environment
        if not setup_environment():
            print("❌ Environment setup failed")
            return
        
        # Initialize detector with default model paths
        detector = TwoStageDefectDetector(
            confidence_threshold=0.4,  # Lower threshold for testing
            output_dir="test_results"
        )
        
        # Load models
        print("\n🔄 Loading models...")
        if not detector.load_models():
            print("❌ Model loading failed. Check if training is complete:")
            print("   - Transformer model: runs/seg_y11n_tx3/weights/best.pt")
            print("   - Defect model: runs/detect/transformer_defects_v1/weights/best.pt")
            return
        
        # Process the sample image
        print(f"\n🚀 Processing sample image...")
        result = detector.process_single_image(sample_image)
        
        # Display results
        print(f"\n📊 Test Results:")
        print(f"   Status: {result['status']}")
        
        if result['status'] == 'success':
            stage1 = result['stage1_info']
            stage2 = result['stage2_info']
            defects = result['defects']
            
            print(f"   🎯 Stage 1 (Transformer): {stage1['status']}")
            if stage1['status'] == 'transformer_detected':
                print(f"      Confidence: {stage1['confidence']:.3f}")
                print(f"      Area: {stage1['transformer_area']} pixels")
            
            print(f"   🔍 Stage 2 (Defects): {stage2['defect_count']} found")
            if defects:
                print(f"      Classes detected: {', '.join(stage2['classes_detected'])}")
                print(f"      Defect details:")
                for defect in defects:
                    print(f"        - {defect['class_name']}: {defect['confidence']:.3f}")
            
            print(f"\n💾 Output files:")
            for key, path in result['output_files'].items():
                print(f"      {key}: {path}")
            
            print(f"\n🎉 Test completed successfully!")
            print(f"📁 Check the 'test_results' folder for visual outputs")
            
        else:
            print(f"   ❌ Processing failed: {result.get('message', 'Unknown error')}")
    
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure you're in the yolov11 conda environment")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()