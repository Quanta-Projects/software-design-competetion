#!/usr/bin/env python3
"""
Simple YOLOv11 Segmentation Training Script
==========================================

A simplified version for quick training setup and execution.

Usage:
    python simple_train.py

Requirements:
    - ultralytics
    - torch
    - torchvision
"""

import os
import sys
from pathlib import Path

def main():
    """Simple training function."""
    print("🚀 YOLOv11 Segmentation Training")
    print("=" * 40)
    
    # Fix OpenMP issue
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
    
    try:
        from ultralytics import YOLO
        print("✅ Ultralytics imported successfully")
    except ImportError:
        print("❌ Ultralytics not found. Please install it:")
        print("   pip install ultralytics")
        return
    
    # Check if dataset exists
    data_path = Path("dataset/data.yaml")
    if not data_path.exists():
        print(f"❌ Dataset not found: {data_path}")
        print("   Please ensure you're in the tf_model directory")
        return
    
    print(f"✅ Dataset found: {data_path}")
    
    # Training configuration
    config = {
        'model': 'yolo11n-seg.pt',
        'data': str(data_path),
        'epochs': 100,
        'imgsz': 640,
        'device': 0,  # GPU
        'project': 'runs',
        'name': 'seg_yolo11_python',
        'batch': 16,
        'lr0': 0.01,
        'patience': 100,
        'save_period': 10,
        'amp': True,
        'cache': False,
        'verbose': True,
        'plots': True
    }
    
    print("\n📋 Training Configuration:")
    for key, value in config.items():
        print(f"   {key}: {value}")
    
    # Initialize and train model
    print("\n🏗️  Loading model...")
    model = YOLO(config['model'])
    
    print("🚀 Starting training...")
    print("   This may take 30-60 minutes depending on your GPU")
    print("   Press Ctrl+C to stop training early")
    
    try:
        # Start training
        results = model.train(**config)
        
        print("\n🎉 Training completed successfully!")
        print(f"📁 Results saved to: {Path(config['project']) / config['name']}")
        
        # Show best model location
        best_model = Path(config['project']) / config['name'] / 'weights' / 'best.pt'
        print(f"🏆 Best model: {best_model}")
        
        return results
        
    except KeyboardInterrupt:
        print("\n⏹️  Training stopped by user")
        return None
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        return None

if __name__ == "__main__":
    # Check if we're in the right directory
    if not os.path.exists('dataset'):
        print("❌ Please run this script from the tf_model directory")
        print("   Expected structure: tf_model/dataset/data.yaml")
        sys.exit(1)
    
    main()