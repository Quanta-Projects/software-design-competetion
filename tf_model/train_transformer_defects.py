#!/usr/bin/env python3
"""
YOLOv11 Training Script for Transformer Defects Dataset
======================================================

This script trains a YOLOv11 detection model on the Transformer Defects dataset
for detecting 6 different types of transformer defects.

Dataset Classes:
1. Full Wire Overload PF
2. Loose Joint F  
3. Loose Joint PF
4. Point Overload F
5. Point Overload PF
6. Transformer Overload

Usage:
    python train_transformer_defects.py
    python train_transformer_defects.py --epochs 200 --model yolo11m.pt
"""

import os
import sys
import time
import yaml
from pathlib import Path
from datetime import datetime

def setup_environment():
    """Setup environment variables and check requirements."""
    print("🔧 Setting up environment...")
    
    # Fix OpenMP duplicate library issue
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
    
    # Add memory optimization environment variables
    os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:128'
    
    try:
        from ultralytics import YOLO
        import torch
    except ImportError:
        print("❌ Required packages not found. Please install:")
        print("   conda activate yolov11")
        print("   pip install ultralytics torch")
        return False
    
    # Check if GPU is available
    if torch.cuda.is_available():
        gpu_count = torch.cuda.device_count()
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"✅ GPU available: {gpu_name}")
        print(f"   GPU count: {gpu_count}")
        print(f"   GPU memory: {gpu_memory:.2f} GB")
        print(f"   CUDA version: {torch.version.cuda}")
        
        # Memory warning for low VRAM
        if gpu_memory < 6:
            print(f"⚠️  Low GPU memory detected! Training optimized for memory efficiency:")
            print(f"   • Batch size: 4 (reduced)")
            print(f"   • Workers: 2 (reduced)")
            print(f"   • Mosaic augmentation: disabled")
    else:
        print("⚠️  No GPU available, using CPU (training will be slower)")
    
    print(f"🐍 PyTorch version: {torch.__version__}")
    print(f"\n💡 Memory Tips:")
    print(f"   • Close other applications to free up RAM")
    print(f"   • If training still fails, reduce batch size further")
    print(f"   • Consider increasing Windows virtual memory (paging file)")
    
    return True

def validate_dataset(data_path="Transformer Defects/data.yaml"):
    """Validate the Transformer Defects dataset structure."""
    print("📊 Validating Transformer Defects dataset...")
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset YAML not found: {data_path}")
    
    with open(data_path, 'r') as f:
        data_config = yaml.safe_load(f)
    
    # Check required keys
    required_keys = ['train', 'val', 'nc', 'names']
    missing_keys = [key for key in required_keys if key not in data_config]
    
    if missing_keys:
        raise ValueError(f"Missing required keys in data.yaml: {missing_keys}")
    
    # Check if paths exist (relative to data.yaml location)
    dataset_dir = Path(data_path).parent
    
    train_path = dataset_dir / "train" / "images"
    val_path = dataset_dir / "valid" / "images"
    test_path = dataset_dir / "test" / "images"
    
    if not train_path.exists():
        raise FileNotFoundError(f"Training images directory not found: {train_path}")
    
    if not val_path.exists():
        raise FileNotFoundError(f"Validation images directory not found: {val_path}")
    
    # Count images and labels
    train_images = len(list(train_path.glob('*.jpg')) + list(train_path.glob('*.png')))
    val_images = len(list(val_path.glob('*.jpg')) + list(val_path.glob('*.png')))
    test_images = len(list(test_path.glob('*.jpg')) + list(test_path.glob('*.png'))) if test_path.exists() else 0
    
    # Count labels
    train_labels = len(list((dataset_dir / "train" / "labels").glob('*.txt')))
    val_labels = len(list((dataset_dir / "valid" / "labels").glob('*.txt')))
    
    print(f"✅ Dataset validation passed")
    print(f"   Classes: {data_config['nc']} - {data_config['names']}")
    print(f"   Training: {train_images} images, {train_labels} labels")
    print(f"   Validation: {val_images} images, {val_labels} labels")
    if test_images > 0:
        print(f"   Test: {test_images} images")
    
    return data_config, train_images, val_images

def create_training_config():
    """Create optimized training configuration for defect detection."""
    
    config = {
        # Model settings
        'model': 'yolo11n.pt',  # Start with nano for faster training
        'data': 'Transformer Defects/data.yaml',
        
        # Training parameters - MEMORY OPTIMIZED
        'epochs': 150,
        'patience': 25,
        'batch': 4,  # Reduced from 16 to 4 for memory constraints
        'imgsz': 640,
        'device': 0,  # Use GPU if available
        
        # Output settings
        'project': 'runs/detect',
        'name': 'transformer_defects_v1',
        'save_period': 10,
        
        # Optimization
        'amp': True,  # Automatic Mixed Precision
        'cache': False,  # Disabled for memory safety
        'workers': 2,  # Reduced from 8 to 2 workers to save memory
        'lr0': 0.01,
        'lrf': 0.01,
        'momentum': 0.937,
        'weight_decay': 0.0005,
        'warmup_epochs': 3.0,
        'warmup_momentum': 0.8,
        'warmup_bias_lr': 0.1,
        
        # Loss weights (adjust based on your priorities)
        'box': 7.5,      # Bounding box loss
        'cls': 0.5,      # Classification loss
        'dfl': 1.5,      # DFL loss
        
        # Data augmentation - REDUCED FOR MEMORY
        'hsv_h': 0.015,
        'hsv_s': 0.7,
        'hsv_v': 0.4,
        'degrees': 0.0,
        'translate': 0.1,
        'scale': 0.5,
        'shear': 0.0,
        'perspective': 0.0,
        'flipud': 0.0,
        'fliplr': 0.5,
        'mosaic': 0.0,  # DISABLED - mosaic uses 4x memory
        'mixup': 0.0,
        'copy_paste': 0.0,
        
        # Validation
        'val': True,
        'plots': True,
        'save_json': True,
        'verbose': True
    }
    
    return config

def train_defect_detection_model():
    """Train YOLOv11 model for transformer defect detection."""
    
    print("🚀 YOLOv11 Transformer Defects Training")
    print("=" * 50)
    
    try:
        # Setup environment
        if not setup_environment():
            return False
        
        # Import after environment setup
        from ultralytics import YOLO
        
        # Validate dataset
        data_config, train_count, val_count = validate_dataset()
        
        # Create training configuration
        training_config = create_training_config()
        
        # Print training summary
        print(f"\n📋 Training Configuration:")
        print(f"   🏗️  Model: {training_config['model']}")
        print(f"   📊 Dataset: {training_config['data']}")
        print(f"   🎯 Classes: {data_config['nc']} defect types")
        print(f"   📷 Training Images: {train_count}")
        print(f"   📷 Validation Images: {val_count}")
        print(f"   🔢 Epochs: {training_config['epochs']}")
        print(f"   📦 Batch Size: {training_config['batch']}")
        print(f"   📐 Image Size: {training_config['imgsz']}")
        print(f"   💻 Device: {training_config['device']}")
        print(f"   ⚡ AMP: {training_config['amp']}")
        print(f"   📁 Output: {training_config['project']}/{training_config['name']}")
        
        print(f"\n🏷️  Defect Classes:")
        for i, class_name in enumerate(data_config['names']):
            print(f"   {i}: {class_name}")
        
        # Initialize model
        print(f"\n🏗️  Loading model: {training_config['model']}")
        model = YOLO(training_config['model'])
        print(f"✅ Model loaded successfully")
        
        # Start training
        print(f"\n🚀 Starting training...")
        print(f"   Expected duration: ~{training_config['epochs'] * train_count / 1000:.1f} minutes")
        print(f"   Press Ctrl+C to stop early")
        
        start_time = time.time()
        
        # Train the model
        results = model.train(**training_config)
        
        end_time = time.time()
        training_duration = end_time - start_time
        
        # Training completed
        print(f"\n🎉 Training Completed Successfully!")
        print(f"⏱️  Total Training Time: {training_duration/3600:.2f} hours")
        
        # Print results location
        results_dir = Path(training_config['project']) / training_config['name']
        print(f"📁 Results saved to: {results_dir.absolute()}")
        
        # List key generated files
        key_files = [
            'weights/best.pt',
            'weights/last.pt',
            'results.png',
            'confusion_matrix.png',
            'val_batch0_pred.jpg'
        ]
        
        print(f"\n📋 Key Generated Files:")
        for file_name in key_files:
            file_path = results_dir / file_name
            if file_path.exists():
                print(f"   ✅ {file_name}")
            else:
                print(f"   ❌ {file_name}")
        
        # Validation results
        if results:
            print(f"\n📊 Final Metrics:")
            try:
                # Extract key metrics from results
                best_results = results.results_dict if hasattr(results, 'results_dict') else {}
                if best_results:
                    print(f"   📈 Best mAP@0.5: {best_results.get('metrics/mAP50(B)', 'N/A')}")
                    print(f"   📈 Best mAP@0.5:0.95: {best_results.get('metrics/mAP50-95(B)', 'N/A')}")
            except:
                print(f"   📊 Check results.png for detailed metrics")
        
        return True
        
    except KeyboardInterrupt:
        print(f"\n⏹️  Training interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function."""
    print("🔍 YOLOv11 Transformer Defects Trainer")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not os.path.exists('Transformer Defects'):
        print("❌ 'Transformer Defects' directory not found")
        print("   Please run this script from the tf_model directory")
        print("   Current directory should contain 'Transformer Defects/' folder")
        return
    
    # Start training
    success = train_defect_detection_model()
    
    if success:
        print(f"\n🎊 Training completed successfully!")
        print(f"📂 Your trained model is ready for defect detection!")
        
        # Provide next steps
        print(f"\n🚀 Next Steps:")
        print(f"   1. Check training results in runs/detect/transformer_defects_v1/")
        print(f"   2. Validate model with: yolo val model=runs/detect/transformer_defects_v1/weights/best.pt")
        print(f"   3. Run inference: yolo predict model=runs/detect/transformer_defects_v1/weights/best.pt source=path/to/images")
        print(f"   4. Export model: yolo export model=runs/detect/transformer_defects_v1/weights/best.pt format=onnx")
        
    else:
        print(f"\n❌ Training was not successful")
        print(f"   Check error messages above for troubleshooting")

if __name__ == "__main__":
    main()