
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
