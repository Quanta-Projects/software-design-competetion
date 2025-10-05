#!/usr/bin/env python3
"""
Configurable YOLOv11 Segmentation Training Script
================================================

This script reads configuration from training_config.ini and trains
a YOLOv11 segmentation model with those parameters.

Usage:
    python config_train.py [--config path/to/config.ini]

Example:
    python config_train.py
    python config_train.py --config custom_config.ini
"""

import os
import sys
import argparse
import configparser
from pathlib import Path

def load_config(config_path="training_config.ini"):
    """Load training configuration from INI file."""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    config = configparser.ConfigParser()
    config.read(config_path)
    
    # Convert to dictionary for easier use
    training_config = {}
    
    # Model settings
    training_config['model'] = config.get('model', 'model_name', fallback='yolo11n-seg.pt')
    
    # Dataset settings
    training_config['data'] = config.get('dataset', 'data_path', fallback='dataset/data.yaml')
    
    # Training settings
    training_config['epochs'] = config.getint('training', 'epochs', fallback=100)
    training_config['imgsz'] = config.getint('training', 'image_size', fallback=640)
    training_config['batch'] = config.getint('training', 'batch_size', fallback=16)
    training_config['device'] = config.get('training', 'device', fallback='0')
    training_config['project'] = config.get('training', 'project_dir', fallback='runs')
    training_config['name'] = config.get('training', 'experiment_name', fallback='seg_yolo11_config')
    training_config['patience'] = config.getint('training', 'patience', fallback=100)
    training_config['save_period'] = config.getint('training', 'save_period', fallback=10)
    
    # Optimization settings
    training_config['lr0'] = config.getfloat('optimization', 'learning_rate', fallback=0.01)
    training_config['lrf'] = config.getfloat('optimization', 'final_lr_ratio', fallback=0.01)
    training_config['momentum'] = config.getfloat('optimization', 'momentum', fallback=0.937)
    training_config['weight_decay'] = config.getfloat('optimization', 'weight_decay', fallback=0.0005)
    training_config['warmup_epochs'] = config.getfloat('optimization', 'warmup_epochs', fallback=3.0)
    training_config['amp'] = config.getboolean('optimization', 'use_amp', fallback=True)
    training_config['cache'] = config.getboolean('optimization', 'use_cache', fallback=False)
    
    # Augmentation settings
    training_config['hsv_h'] = config.getfloat('augmentation', 'hsv_h', fallback=0.015)
    training_config['hsv_s'] = config.getfloat('augmentation', 'hsv_s', fallback=0.7)
    training_config['hsv_v'] = config.getfloat('augmentation', 'hsv_v', fallback=0.4)
    training_config['degrees'] = config.getfloat('augmentation', 'rotation_degrees', fallback=0.0)
    training_config['translate'] = config.getfloat('augmentation', 'translation', fallback=0.1)
    training_config['scale'] = config.getfloat('augmentation', 'scale_factor', fallback=0.5)
    training_config['shear'] = config.getfloat('augmentation', 'shear_degrees', fallback=0.0)
    training_config['perspective'] = config.getfloat('augmentation', 'perspective', fallback=0.0)
    training_config['fliplr'] = config.getfloat('augmentation', 'flip_horizontal', fallback=0.5)
    training_config['flipud'] = config.getfloat('augmentation', 'flip_vertical', fallback=0.0)
    training_config['mosaic'] = config.getfloat('augmentation', 'mosaic_prob', fallback=1.0)
    training_config['mixup'] = config.getfloat('augmentation', 'mixup_prob', fallback=0.0)
    training_config['copy_paste'] = config.getfloat('augmentation', 'copy_paste_prob', fallback=0.0)
    
    # Loss settings
    training_config['box'] = config.getfloat('loss', 'box_loss_gain', fallback=7.5)
    training_config['cls'] = config.getfloat('loss', 'class_loss_gain', fallback=0.5)
    training_config['dfl'] = config.getfloat('loss', 'dfl_loss_gain', fallback=1.5)
    
    # Output settings
    training_config['plots'] = config.getboolean('output', 'save_plots', fallback=True)
    training_config['verbose'] = config.getboolean('output', 'verbose_output', fallback=True)
    
    return training_config

def print_config(config):
    """Print the loaded configuration."""
    print("📋 Training Configuration:")
    print("=" * 30)
    
    print(f"🏗️  Model: {config['model']}")
    print(f"📊 Dataset: {config['data']}")
    print(f"🔢 Epochs: {config['epochs']}")
    print(f"📐 Image Size: {config['imgsz']}")
    print(f"📦 Batch Size: {config['batch']}")
    print(f"💻 Device: {config['device']}")
    print(f"📁 Output: {config['project']}/{config['name']}")
    print(f"🎯 Learning Rate: {config['lr0']} → {config['lrf']}")
    print(f"⚡ AMP: {config['amp']}")
    print(f"💾 Cache: {config['cache']}")
    print()

def train_with_config(config_path="training_config.ini"):
    """Train YOLOv11 segmentation model using configuration file."""
    
    # Fix OpenMP issue
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
    
    print("🚀 YOLOv11 Segmentation Training (Config-based)")
    print("=" * 50)
    
    try:
        # Import ultralytics
        from ultralytics import YOLO
        print("✅ Ultralytics imported successfully")
    except ImportError:
        print("❌ Ultralytics not found. Please install it:")
        print("   conda activate yolov11")
        print("   pip install ultralytics")
        return None
    
    # Load configuration
    print(f"📖 Loading configuration from: {config_path}")
    try:
        config = load_config(config_path)
        print("✅ Configuration loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load configuration: {e}")
        return None
    
    # Print configuration
    print_config(config)
    
    # Validate dataset
    data_path = Path(config['data'])
    if not data_path.exists():
        print(f"❌ Dataset not found: {data_path}")
        return None
    
    print(f"✅ Dataset found: {data_path}")
    
    # Initialize model
    print(f"🏗️  Loading model: {config['model']}")
    try:
        model = YOLO(config['model'])
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return None
    
    # Start training
    print("🚀 Starting training...")
    print("   Press Ctrl+C to stop early")
    
    try:
        results = model.train(**config)
        
        print("\n🎉 Training completed successfully!")
        
        # Show results location
        results_dir = Path(config['project']) / config['name']
        print(f"📁 Results saved to: {results_dir.absolute()}")
        
        # Show key files
        weights_dir = results_dir / 'weights'
        if weights_dir.exists():
            best_model = weights_dir / 'best.pt'
            last_model = weights_dir / 'last.pt'
            
            if best_model.exists():
                print(f"🏆 Best model: {best_model}")
            if last_model.exists():
                print(f"📝 Last model: {last_model}")
        
        return results
        
    except KeyboardInterrupt:
        print("\n⏹️  Training interrupted by user")
        return None
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='YOLOv11 Segmentation Training with Config File')
    parser.add_argument('--config', '-c', default='training_config.ini', 
                      help='Path to configuration file (default: training_config.ini)')
    
    args = parser.parse_args()
    
    # Check if we're in the right directory
    if not os.path.exists('dataset'):
        print("❌ Please run this script from the tf_model directory")
        print("   Expected structure: tf_model/dataset/data.yaml")
        return
    
    # Run training
    results = train_with_config(args.config)
    
    if results:
        print("\n✅ Training completed successfully!")
        print("🎯 Your YOLOv11 segmentation model is ready!")
    else:
        print("\n❌ Training was not successful")

if __name__ == "__main__":
    main()