#!/usr/bin/env python3
"""
YOLOv11 Segmentation Training Script
====================================

This script trains a YOLOv11 segmentation model using your custom dataset.
It provides more control and monitoring capabilities than the CLI approach.

Usage:
    python train_yolo_segmentation.py

Author: AI Assistant
Date: October 2025
"""

import os
import sys
import time
import yaml
from pathlib import Path
from datetime import datetime
import torch
import numpy as np
import matplotlib.pyplot as plt
from ultralytics import YOLO

# Configuration
CONFIG = {
    'model': 'yolo11n-seg.pt',  # Model to use (yolo11n-seg.pt, yolo11s-seg.pt, etc.)
    'data': 'dataset/data.yaml',  # Path to dataset YAML
    'epochs': 100,
    'imgsz': 640,
    'batch': 16,  # -1 for auto batch size
    'device': 0,  # GPU device, use 'cpu' for CPU training
    'project': 'runs',
    'name': 'seg_yolo11_custom',
    'patience': 100,
    'save_period': 10,  # Save checkpoint every N epochs
    'cache': False,  # Use image caching for faster training
    'amp': True,  # Automatic Mixed Precision
    'lr0': 0.01,  # Initial learning rate
    'lrf': 0.01,  # Final learning rate
    'momentum': 0.937,
    'weight_decay': 0.0005,
    'warmup_epochs': 3.0,
    'warmup_momentum': 0.8,
    'warmup_bias_lr': 0.1,
    'box': 7.5,  # Box loss gain
    'cls': 0.5,  # Class loss gain
    'dfl': 1.5,  # DFL loss gain
    'pose': 12.0,  # Pose loss gain
    'kobj': 1.0,  # Keypoint object loss gain
    'label_smoothing': 0.0,
    'nbs': 64,  # Nominal batch size
    'hsv_h': 0.015,  # HSV-Hue augmentation
    'hsv_s': 0.7,  # HSV-Saturation augmentation
    'hsv_v': 0.4,  # HSV-Value augmentation
    'degrees': 0.0,  # Rotation degrees
    'translate': 0.1,  # Translation fraction
    'scale': 0.5,  # Scaling factor
    'shear': 0.0,  # Shear degrees
    'perspective': 0.0,  # Perspective transform
    'flipud': 0.0,  # Vertical flip probability
    'fliplr': 0.5,  # Horizontal flip probability
    'mosaic': 1.0,  # Mosaic probability
    'mixup': 0.0,  # Mixup probability
    'copy_paste': 0.0,  # Copy paste probability
}

def setup_environment():
    """Setup environment variables and check requirements."""
    print("🔧 Setting up environment...")
    
    # Fix OpenMP duplicate library issue
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
    
    # Check if GPU is available
    if torch.cuda.is_available():
        gpu_count = torch.cuda.device_count()
        gpu_name = torch.cuda.get_device_name(0)
        print(f"✅ GPU available: {gpu_name}")
        print(f"   GPU count: {gpu_count}")
        print(f"   CUDA version: {torch.version.cuda}")
    else:
        print("⚠️  No GPU available, using CPU (training will be slower)")
        CONFIG['device'] = 'cpu'
    
    # Check PyTorch version
    print(f"🐍 PyTorch version: {torch.__version__}")
    
    return True

def validate_dataset(data_path):
    """Validate dataset structure and configuration."""
    print("📊 Validating dataset...")
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset YAML not found: {data_path}")
    
    with open(data_path, 'r') as f:
        data_config = yaml.safe_load(f)
    
    required_keys = ['train', 'val', 'nc', 'names']
    missing_keys = [key for key in required_keys if key not in data_config]
    
    if missing_keys:
        raise ValueError(f"Missing required keys in data.yaml: {missing_keys}")
    
    # Check if paths exist (relative to data.yaml location)
    dataset_dir = Path(data_path).parent
    
    train_path = dataset_dir / data_config['train'].replace('../', '')
    val_path = dataset_dir / data_config['val'].replace('../', '')
    
    if not train_path.exists():
        raise FileNotFoundError(f"Training images directory not found: {train_path}")
    
    if not val_path.exists():
        raise FileNotFoundError(f"Validation images directory not found: {val_path}")
    
    # Count images
    train_images = len(list(train_path.glob('*.jpg')) + list(train_path.glob('*.png')))
    val_images = len(list(val_path.glob('*.jpg')) + list(val_path.glob('*.png')))
    
    print(f"✅ Dataset validation passed")
    print(f"   Classes: {data_config['nc']} ({data_config['names']})")
    print(f"   Training images: {train_images}")
    print(f"   Validation images: {val_images}")
    
    return data_config, train_images, val_images

def create_training_summary(config, data_config, train_count, val_count):
    """Create a training summary."""
    summary = f"""
🚀 YOLOv11 Segmentation Training Summary
========================================

📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

🏗️  Model Configuration:
   Model: {config['model']}
   Image Size: {config['imgsz']}x{config['imgsz']}
   Batch Size: {config['batch']}
   Epochs: {config['epochs']}
   Device: {config['device']}

📊 Dataset:
   Classes: {data_config['nc']} ({', '.join(data_config['names'])})
   Training Images: {train_count}
   Validation Images: {val_count}

🎯 Training Parameters:
   Learning Rate: {config['lr0']} → {config['lrf']}
   Momentum: {config['momentum']}
   Weight Decay: {config['weight_decay']}
   AMP Enabled: {config['amp']}

🔄 Data Augmentation:
   HSV: H±{config['hsv_h']}, S±{config['hsv_s']}, V±{config['hsv_v']}
   Rotation: ±{config['degrees']}°
   Translation: ±{config['translate']}
   Scale: ±{config['scale']}
   Flip LR: {config['fliplr']}
   Mosaic: {config['mosaic']}

📁 Output Directory: {config['project']}/{config['name']}
"""
    print(summary)
    return summary

def train_model():
    """Main training function."""
    print("🤖 Starting YOLOv11 Segmentation Training")
    print("=" * 50)
    
    try:
        # Setup environment
        setup_environment()
        
        # Validate dataset
        data_config, train_count, val_count = validate_dataset(CONFIG['data'])
        
        # Create training summary
        summary = create_training_summary(CONFIG, data_config, train_count, val_count)
        
        # Initialize model
        print("🏗️  Loading model...")
        model = YOLO(CONFIG['model'])
        print(f"✅ Model loaded: {CONFIG['model']}")
        
        # Start training
        print("🚀 Starting training...")
        start_time = time.time()
        
        results = model.train(
            data=CONFIG['data'],
            epochs=CONFIG['epochs'],
            imgsz=CONFIG['imgsz'],
            batch=CONFIG['batch'],
            device=CONFIG['device'],
            project=CONFIG['project'],
            name=CONFIG['name'],
            patience=CONFIG['patience'],
            save_period=CONFIG['save_period'],
            cache=CONFIG['cache'],
            amp=CONFIG['amp'],
            lr0=CONFIG['lr0'],
            lrf=CONFIG['lrf'],
            momentum=CONFIG['momentum'],
            weight_decay=CONFIG['weight_decay'],
            warmup_epochs=CONFIG['warmup_epochs'],
            warmup_momentum=CONFIG['warmup_momentum'],
            warmup_bias_lr=CONFIG['warmup_bias_lr'],
            box=CONFIG['box'],
            cls=CONFIG['cls'],
            dfl=CONFIG['dfl'],
            pose=CONFIG['pose'],
            kobj=CONFIG['kobj'],
            label_smoothing=CONFIG['label_smoothing'],
            nbs=CONFIG['nbs'],
            hsv_h=CONFIG['hsv_h'],
            hsv_s=CONFIG['hsv_s'],
            hsv_v=CONFIG['hsv_v'],
            degrees=CONFIG['degrees'],
            translate=CONFIG['translate'],
            scale=CONFIG['scale'],
            shear=CONFIG['shear'],
            perspective=CONFIG['perspective'],
            flipud=CONFIG['flipud'],
            fliplr=CONFIG['fliplr'],
            mosaic=CONFIG['mosaic'],
            mixup=CONFIG['mixup'],
            copy_paste=CONFIG['copy_paste']
        )
        
        end_time = time.time()
        training_duration = end_time - start_time
        
        # Training completed successfully
        print("\n" + "=" * 50)
        print("🎉 Training Completed Successfully!")
        print(f"⏱️  Total Training Time: {training_duration/3600:.2f} hours")
        
        # Print results location
        results_dir = Path(CONFIG['project']) / CONFIG['name']
        print(f"📁 Results saved to: {results_dir.absolute()}")
        
        # List generated files
        if results_dir.exists():
            print("\n📋 Generated Files:")
            for file in sorted(results_dir.rglob('*')):
                if file.is_file():
                    print(f"   📄 {file.name}")
        
        return results
        
    except KeyboardInterrupt:
        print("\n⏹️  Training interrupted by user")
        return None
    except Exception as e:
        print(f"\n❌ Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def validate_model(results_dir=None):
    """Validate the trained model."""
    if results_dir is None:
        results_dir = Path(CONFIG['project']) / CONFIG['name']
    
    best_model = results_dir / 'weights' / 'best.pt'
    
    if not best_model.exists():
        print("❌ Best model not found. Training may not have completed.")
        return
    
    print(f"\n🔍 Validating model: {best_model}")
    
    try:
        # Load and validate model
        model = YOLO(str(best_model))
        results = model.val(data=CONFIG['data'])
        
        print("✅ Model validation completed")
        print(f"📊 Results: {results}")
        
    except Exception as e:
        print(f"❌ Validation failed: {str(e)}")

def main():
    """Main function."""
    print("🎯 YOLOv11 Segmentation Trainer")
    print("================================")
    
    # Check if we're in the right directory
    if not os.path.exists('dataset/data.yaml'):
        print("❌ Please run this script from the tf_model directory")
        print("   Current directory should contain 'dataset/data.yaml'")
        return
    
    # Start training
    results = train_model()
    
    if results:
        # Optional: Run validation
        print("\n🔍 Running model validation...")
        validate_model()
        
        print("\n✅ All tasks completed!")
        print("🚀 Your YOLOv11 segmentation model is ready!")
    else:
        print("\n❌ Training was not successful")

if __name__ == "__main__":
    main()