# YOLO Training Script for Thermal Anomaly Detection
# This script trains a YOLOv8 model on the generated thermal anomaly dataset

# Fix OpenMP conflict (must be set before importing any libraries)
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import sys
from pathlib import Path
from ultralytics import YOLO

def install_requirements():
    """Install required packages"""
    try:
        from ultralytics import YOLO
        print("✅ Ultralytics already installed")
    except ImportError:
        print("📦 Installing ultralytics package...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "ultralytics"])
        from ultralytics import YOLO
        print("✅ Ultralytics installed successfully")

def train_yolo_model():
    """Train YOLOv8 model on thermal anomaly dataset"""
    
    # Check for GPU availability
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'
    
    print(f"🖥️  Device: {device.upper()}")
    if device == 'cuda':
        print(f"🚀 GPU: {gpu_name}")
        print(f"⚡ CUDA Version: {torch.version.cuda}")
        print(f"🔥 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    # Configuration - Conservative memory settings for RTX 3050 Ti (4GB VRAM)
    dataset_config = "D:/ACCA Sem 7/Software Design Competetion/quanta-project/Fork/software-design-competetion-forked/ai-anomaly-service/yolo_dataset/data.yaml"
    model_name = "yolov8n.pt"  # nano version for faster training
    epochs = 100
    image_size = 416 if device == 'cuda' else 640  # Smaller image size for GPU to save memory
    batch_size = 8 if device == 'cuda' else 16     # Smaller batch for 4GB GPU
    
    # Verify dataset exists
    if not os.path.exists(dataset_config):
        print(f"❌ Dataset config not found: {dataset_config}")
        print("Please run yolo_thermal_detector.py first to generate the dataset")
        return
    
    print("🚀 Starting YOLO Training...")
    print(f"📊 Dataset: {dataset_config}")
    print(f"🏗️  Model: {model_name}")
    print(f"📈 Epochs: {epochs}")
    print(f"🖼️  Image size: {image_size}")
    print(f"📦 Batch size: {batch_size}")
    
    try:
        # Load a model
        model = YOLO(model_name)  # build a new model from YAML
        
        # Train the model
        results = model.train(
            data=dataset_config,
            epochs=epochs,
            imgsz=image_size,
            batch=batch_size,
            name='thermal_anomaly_detector',
            project='yolo_runs',
            save=True,
            plots=True,
            device=device,  # Auto-detected GPU or CPU
            verbose=True,
            # Conservative GPU settings for memory optimization
            amp=False,  # Disable AMP to reduce memory usage
            workers=2 if device == 'cuda' else 4,  # Fewer workers to reduce memory pressure
            cache=False,  # Disable caching to save memory
        )
        
        print("✅ Training completed successfully!")
        print(f"📁 Results saved to: {results.save_dir}")
        
        # Validate the model
        print("🔍 Running validation...")
        metrics = model.val()
        
        print("📊 Validation Results:")
        print(f"   mAP50: {metrics.box.map50:.3f}")
        print(f"   mAP50-95: {metrics.box.map:.3f}")
        
        # Save the trained model
        model_save_path = "thermal_anomaly_model.pt"
        model.save(model_save_path)
        print(f"💾 Model saved as: {model_save_path}")
        
        return model, results
        
    except Exception as e:
        print(f"❌ Training failed: {str(e)}")
        return None, None

def test_inference(model_path="thermal_anomaly_model.pt"):
    """Test inference on some sample images"""
    
    if not os.path.exists(model_path):
        print(f"❌ Model not found: {model_path}")
        return
    
    print("🔬 Testing inference...")
    
    try:
        from ultralytics import YOLO
        
        # Load trained model
        model = YOLO(model_path)
        
        # Test on some images from the test set
        test_images_dir = "yolo_dataset/images/test"
        if os.path.exists(test_images_dir):
            test_images = list(Path(test_images_dir).glob("*.jpg"))[:3]  # Test on first 3 images
            
            for img_path in test_images:
                print(f"  Testing on: {img_path.name}")
                
                # Run inference
                results = model(str(img_path))
                
                # Save results
                output_path = f"test_results/{img_path.stem}_prediction.jpg"
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                
                # Plot results
                for r in results:
                    r.save(filename=output_path)
                
                print(f"    Predictions saved to: {output_path}")
                print(f"    Detected {len(results[0].boxes)} objects")
        
        print("✅ Inference testing completed!")
        
    except Exception as e:
        print(f"❌ Inference testing failed: {str(e)}")

def create_training_summary():
    """Create a summary of the training setup"""
    
    summary = """
# Thermal Anomaly Detection - YOLO Training Summary

## Dataset Statistics
- **Total Images**: 106 thermal images
- **Training Split**: 74 images (70%)
- **Validation Split**: 21 images (20%) 
- **Test Split**: 11 images (10%)
- **Total Detections**: 473 anomalies
- **Average per Image**: 4.46 detections

## Class Distribution
- **Class 0**: Loose Joint (Faulty) - 13 detections
- **Class 1**: Loose Joint (Potential) - 78 detections  
- **Class 2**: Point Overload (Faulty) - 71 detections
- **Class 3**: Point Overload (Potential) - 170 detections
- **Class 4**: Full Wire Overload (Potential) - 75 detections
- **Class 5**: Hotspot (Review) - 0 detections
- **Class 6**: Warm Area (Likely Normal) - 66 detections

## Model Configuration
- **Architecture**: YOLOv8 Nano (yolov8n.pt)
- **Input Size**: 640x640 pixels
- **Batch Size**: 32 (GPU) / 16 (CPU) - Auto-detected
- **Epochs**: 100
- **Optimizer**: AdamW
- **Device**: Auto-detected (CUDA GPU preferred, CPU fallback)
- **Mixed Precision**: Enabled for GPU training (AMP)
- **Workers**: 8 (GPU) / 4 (CPU) for data loading

## Label Format (YOLO)
Each text file contains bounding boxes in format:
```
class_id x_center y_center width height
```
All coordinates are normalized (0-1).

## Training Command
```python
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
results = model.train(
    data='yolo_dataset/data.yaml',
    epochs=100,
    imgsz=640,
    batch=16,
    name='thermal_anomaly_detector'
)
```

## Next Steps
1. Review training results in `yolo_runs/thermal_anomaly_detector/`
2. Test inference on new thermal images
3. Fine-tune hyperparameters if needed
4. Deploy model in FastAPI service for real-time detection
"""
    
    with open("TRAINING_SUMMARY.md", "w") as f:
        f.write(summary)
    
    print("📋 Training summary saved to: TRAINING_SUMMARY.md")

def main():
    """Main training pipeline"""
    
    print("🔥 Thermal Anomaly Detection - YOLO Training Pipeline")
    print("=" * 60)
    
    # Step 1: Install requirements
    install_requirements()
    
    # Step 2: Create training summary
    create_training_summary()
    
    # Step 3: Train the model
    model = train_yolo_model()
    
    if model is not None:
        # Step 4: Test inference
        test_inference()
        
        print("\n🎉 Training pipeline completed!")
        print("\n📊 Check the following for results:")
        print("   - yolo_runs/thermal_anomaly_detector/ (training logs)")
        print("   - thermal_anomaly_model.pt (trained model)")
        print("   - test_results/ (sample predictions)")
        print("   - TRAINING_SUMMARY.md (detailed summary)")
    else:
        print("\n❌ Training failed. Please check the errors above.")

if __name__ == "__main__":
    main()