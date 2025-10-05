# Two-Stage Transformer Defect Detection System

## 🎯 Overview

This system performs **two-stage detection** for transformer defect analysis:

1. **Stage 1**: Segment and locate the transformer in thermal images
2. **Stage 2**: Detect and classify defects within the segmented transformer region

The system can detect **6 types of transformer defects**:
- Full Wire Overload PF
- Loose Joint F
- Loose Joint PF  
- Point Overload F
- Point Overload PF
- Transformer Overload

## 🏗️ Architecture

```
Input Image → Stage 1 (Transformer Segmentation) → Stage 2 (Defect Detection) → Annotated Results
     ↓              ↓                                      ↓                           ↓
Thermal Image → YOLOv11 Segmentation → Cropped Transformer → YOLOv11 Detection → Overlay on Original
```

## 📁 Files Overview

### Core Detection Scripts
- `two_stage_defect_detection.py` - Main detection system with CLI interface
- `defect_detection_gui.py` - Graphical user interface
- `test_two_stage_detection.py` - Quick test script

### Training Scripts  
- `train_transformer_defects.py` - Train defect detection model
- `train_defects.bat` - Windows batch script for training

### Batch Scripts
- `run_two_stage_detection.bat` - Easy Windows GUI launcher
- `run_inference.bat` - Quick inference runner

### Models Required
- `runs/seg_y11n_tx3/weights/best.pt` - Transformer segmentation model
- `runs/detect/transformer_defects_v1/weights/best.pt` - Defect detection model

## 🚀 Usage Methods

### Method 1: Graphical Interface (Recommended)
```bash
# Activate environment
conda activate yolov11

# Run GUI
python defect_detection_gui.py
```

### Method 2: Command Line Interface

#### Single Image Detection
```bash
python two_stage_defect_detection.py --image "path/to/image.jpg"
```

#### Batch Processing
```bash
python two_stage_defect_detection.py --batch "path/to/folder/"
```

#### Advanced Options
```bash
python two_stage_defect_detection.py \
    --image "image.jpg" \
    --confidence 0.5 \
    --transformer-model "path/to/transformer/model.pt" \
    --defect-model "path/to/defect/model.pt" \
    --output "custom_results"
```

### Method 3: Batch Script (Windows)
```bash
# Double-click or run:
run_two_stage_detection.bat
```

### Method 4: Quick Test
```bash
python test_two_stage_detection.py
```

## 📊 Expected Results

### Stage 1: Transformer Detection
- **Input**: Original thermal image
- **Output**: Bounding box around transformer
- **Confidence**: Typically 0.90-0.99 for clear images

### Stage 2: Defect Detection  
- **Input**: Cropped transformer region
- **Output**: Defects with bounding boxes and classifications
- **Classes**: 6 defect types with confidence scores

### Final Output
- **Annotated Image**: Original image with transformer and defect overlays
- **Detailed Visualization**: Multi-panel view showing all stages
- **JSON Report**: Complete detection results and metadata

## 🎨 Output Examples

### Files Generated
For input image `transformer_001.jpg`, the system generates:
- `transformer_001_annotated_20251004_175813.jpg` - Final annotated result
- `transformer_001_detailed_20251004_175813.png` - Detailed visualization  
- `transformer_001_report_20251004_175813.json` - Complete detection report

### Visual Results
- **Cyan Box**: Transformer location (Stage 1)
- **Colored Boxes**: Defects with class labels and confidence scores
- **Color Coding**: Each defect type has a unique color

## ⚙️ Configuration

### Confidence Thresholds
- **0.3-0.4**: More sensitive, detects more potential defects
- **0.5**: Balanced (default)
- **0.6-0.8**: More conservative, only high-confidence detections

### Model Paths
Update model paths in the script if using custom trained models:
```python
detector = TwoStageDefectDetector(
    transformer_model_path="custom/transformer/model.pt",
    defect_model_path="custom/defect/model.pt"
)
```

## 📈 Performance Metrics

### Transformer Segmentation (Stage 1)
- **Accuracy**: ~95% detection rate on thermal images
- **Speed**: ~50ms per image on RTX 5060

### Defect Detection (Stage 2)  
- **mAP@0.5**: 0.465 (46.5% overall accuracy)
- **Best Classes**: 
  - Transformer Overload: 99.5% mAP
  - Loose Joint PF: 99.5% mAP
- **Speed**: ~100ms per cropped transformer region

## 🔧 Troubleshooting

### Common Issues

#### Model Not Found
```
❌ Transformer model not found: runs/seg_y11n_tx3/weights/best.pt
```
**Solution**: Ensure transformer segmentation training is completed first

#### Environment Issues
```
❌ Import "ultralytics" could not be resolved
```
**Solution**: Activate conda environment: `conda activate yolov11`

#### No Transformer Detected
```
⚠️ Status: no_transformer_detected
```
**Solutions**:
- Lower confidence threshold (`--confidence 0.3`)
- Check image quality and lighting
- Ensure image contains visible transformer

#### Poor Defect Detection
**Solutions**:
- Adjust confidence threshold
- Verify image is thermal (not RGB)
- Check if defects are clearly visible in thermal spectrum

### Performance Optimization

#### For Faster Processing
- Use smaller image sizes (resize to 640x640)
- Increase confidence threshold
- Use GPU acceleration

#### For Better Accuracy  
- Use higher resolution images
- Lower confidence threshold
- Ensemble multiple model predictions

## 🛠️ Development Notes

### Adding New Defect Classes
1. Update `defect_classes` list in `TwoStageDefectDetector`
2. Add corresponding colors in `colors` dictionary
3. Retrain defect detection model with new classes

### Custom Model Integration
```python
# Replace model paths
detector = TwoStageDefectDetector(
    transformer_model_path="your_transformer_model.pt",
    defect_model_path="your_defect_model.pt"
)
```

### Extending Functionality
- Add preprocessing filters for image enhancement
- Implement post-processing for result refinement
- Add export capabilities (PDF reports, Excel summaries)

## 📋 System Requirements

### Hardware
- **GPU**: NVIDIA RTX series (recommended) or CPU
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 2GB for models and results

### Software
- **Python**: 3.9+
- **Conda Environment**: yolov11
- **Key Packages**: ultralytics, opencv, matplotlib, numpy

### Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)  
- BMP (.bmp)
- TIFF (.tiff)

## 🎯 Next Steps

### Immediate Use
1. Test with your thermal images using the GUI
2. Adjust confidence thresholds for optimal results
3. Process batch folders for efficiency

### Advanced Applications
1. Integrate with thermal camera systems
2. Develop automated monitoring dashboards  
3. Create predictive maintenance workflows
4. Export results to SCADA systems

## 📞 Support

For issues or questions:
1. Check error messages in the GUI status panel
2. Review model training logs in `runs/detect/transformer_defects_v1/`
3. Verify all required files are present
4. Ensure conda environment is properly activated

---

**Happy Defect Detection! 🔍⚡**