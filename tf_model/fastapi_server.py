# Two-Stage Transformer Defect Detection API
# Integrated with two-stage YOLO model: Stage 1 (Transformer Segmentation) + Stage 2 (Defect Detection)

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import cv2
import numpy as np
from PIL import Image
import io
import base64
from pathlib import Path
from ultralytics import YOLO
import os
import json
from datetime import datetime
import sys
import httpx
import aiofiles
import asyncio
from asyncio import Semaphore
import threading
import shutil
from concurrent.futures import ThreadPoolExecutor
import traceback

# Add parent directory to path to import the two-stage detector
sys.path.append(str(Path(__file__).parent.parent / "tf_model"))

# Create the FastAPI application instance
app = FastAPI(
    title="Two-Stage Transformer Defect Detection API",
    description="Production-ready two-stage transformer defect detection using YOLO11",
    version="5.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API responses
class Detection(BaseModel):
    """Individual defect detection"""
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    area: int
    color: List[int]  # [B, G, R]

class TransformerInfo(BaseModel):
    """Stage 1: Transformer segmentation info"""
    status: str
    confidence: Optional[float] = None
    bbox: Optional[List[int]] = None
    crop_bbox: Optional[List[int]] = None
    transformer_area: Optional[int] = None

class DefectInfo(BaseModel):
    """Stage 2: Defect detection info"""
    status: str
    defect_count: int
    classes_detected: List[str]

class TwoStageDetectionResult(BaseModel):
    """Complete two-stage detection result"""
    success: bool
    stage1_info: TransformerInfo
    stage2_info: DefectInfo
    detections: List[Detection]
    total_detections: int
    severity_level: str
    severity_score: float
    confidence_threshold: float
    processing_time: float
    annotated_image_base64: str
    image_name: str
    image_size: List[int]  # [width, height]
    active_model: Optional[Dict[str, Any]] = None  # Information about the model used for detection

class AnnotationMetadata(BaseModel):
    """Metadata for annotation editing"""
    user_id: Optional[str] = None
    action_type: str  # "auto_detected", "user_added", "user_edited", "user_deleted"
    timestamp: str
    comments: Optional[str] = None

class EditableAnnotation(BaseModel):
    """Editable annotation with metadata"""
    id: Optional[str] = None
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    metadata: AnnotationMetadata

class RetrainingDatasetError(BaseModel):
    """Error details for dataset preparation"""
    imageId: str
    stage: str  # "download" or "labels"
    message: str

class RetrainingDatasetSummary(BaseModel):
    """Summary of retraining dataset preparation"""
    totalImages: int
    skippedAnnotated: int
    downloaded: int
    labeled: int
    errors: List[RetrainingDatasetError]

class TrainingRequest(BaseModel):
    """Request body for model retraining"""
    epochs: int = 50
    batch_size: int = 16
    learning_rate: float = 0.001
    image_size: int = 640
    use_gpu: bool = True
    seed: Optional[int] = 42
    base_model_path: Optional[str] = None
    output_dir: Optional[str] = None

class EpochMetrics(BaseModel):
    """Metrics for a single epoch"""
    epoch: int
    train_loss: Optional[float] = None
    val_loss: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    mAP50: Optional[float] = None
    mAP50_95: Optional[float] = None

class TrainingState(BaseModel):
    """Current state of the training process"""
    status: str  # "idle", "running", "done", "error", "stopped"
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    current_epoch: int = 0
    total_epochs: int = 0
    metrics: List[EpochMetrics] = []
    weights_path: Optional[str] = None
    error: Optional[str] = None
    warnings: List[str] = []
    config: Optional[Dict[str, Any]] = None

class ModelInfo(BaseModel):
    """Information about a model file"""
    name: str
    path: str
    dir: str  # "updated_defect" or "defect"
    size_bytes: int
    modified: str  # ISO format timestamp
    loaded: Optional[bool] = None

class ActiveModelInfo(BaseModel):
    """Information about the active model"""
    name: str
    path: str
    dir: str
    loaded: bool
    selected_at: Optional[str] = None

class ModelsListResponse(BaseModel):
    """Response for model list endpoint"""
    models: List[ModelInfo]
    active_model: Optional[ActiveModelInfo] = None

class SelectModelRequest(BaseModel):
    """Request body for selecting a model"""
    path: str

class SelectModelResponse(BaseModel):
    """Response for model selection"""
    ok: bool
    active_model: Optional[ActiveModelInfo] = None
    error: Optional[str] = None

# Global training state and lock
training_state = {
    "status": "idle",
    "current_epoch": 0,
    "total_epochs": 0,
    "metrics": [],
    "started_at": None,
    "finished_at": None,
    "error": None,
    "weights_path": None,
    "warnings": [],
    "config": None
}
training_lock = threading.Lock()
training_executor = ThreadPoolExecutor(max_workers=1)
log_queue = asyncio.Queue()

# Active model state and lock
ACTIVE_MODEL_FILE = Path("weights/active_model.json")
active_model_info = {
    "name": "best.pt",
    "path": "weights/defects/best.pt",
    "dir": "defect",
    "loaded": False,
    "selected_at": None
}
model_lock = threading.Lock()

# TWO-STAGE TRANSFORMER DEFECT DETECTION ENGINE
class TwoStageTransformerDetector:
    """
    Production-ready two-stage transformer defect detection system
    Stage 1: Segment transformer from thermal image
    Stage 2: Detect defects within segmented transformer
    """
    
    def __init__(self, 
                 transformer_model_path: str = None,
                 defect_model_path: str = None):
        """Initialize the two-stage detection system"""
        
        # Look for transformer segmentation model
        if transformer_model_path is None:
            possible_paths = [
                "../tf_model/weights/segment/best.pt",
                "../../tf_model/weights/segment/best.pt",
                "../weights/segment/best.pt",
                "weights/segment/best.pt"
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    transformer_model_path = path
                    break
            
            if transformer_model_path is None:
                transformer_model_path = "../tf_model/weights/segment/best.pt"
        
        # Look for defect detection model
        if defect_model_path is None:
            possible_paths = [
                "../tf_model/weights/defects/best.pt",
                "../../tf_model/weights/defects/best.pt",
                "../weights/defects/best.pt",
                "weights/defects/best.pt",
                "../tf_model/runs/detect/transformer_defects_v1/weights/best.pt"
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    defect_model_path = path
                    break
            
            if defect_model_path is None:
                defect_model_path = "../tf_model/weights/defects/best.pt"
        
        self.transformer_model_path = transformer_model_path
        self.defect_model_path = defect_model_path
        self.transformer_model = None
        self.defect_model = None
        self.model_version = "5.0.0"
        
        # Define defect classes (6 transformer defect types)
        self.defect_classes = [
            'Full Wire Overload PF',
            'Loose Joint F', 
            'Loose Joint PF',
            'Point Overload F',
            'Point Overload PF',
            'Transformer Overload'
        ]
        
        # Color mapping for different defect types (BGR format)
        self.colors = {
            0: (0, 0, 255),     # Red - Full Wire Overload PF
            1: (0, 165, 255),   # Orange - Loose Joint F
            2: (0, 255, 255),   # Yellow - Loose Joint PF
            3: (255, 0, 0),     # Blue - Point Overload F
            4: (255, 0, 255),   # Magenta - Point Overload PF
            5: (0, 255, 0),     # Green - Transformer Overload
        }
        
        self._load_models()
    
    def _load_models(self):
        """Load both YOLO models (transformer segmentation + defect detection)"""
        try:
            # Load transformer segmentation model
            transformer_full_path = os.path.abspath(self.transformer_model_path)
            print(f"Attempting to load transformer model from: {transformer_full_path}")
            
            if os.path.exists(self.transformer_model_path):
                print(f"✅ Transformer model found at: {self.transformer_model_path}")
                self.transformer_model = YOLO(self.transformer_model_path)
                print(f"✅ Transformer segmentation model loaded successfully")
            else:
                print(f"⚠️ Transformer model not found at {self.transformer_model_path}")
                print("   Stage 1 (transformer segmentation) will be unavailable")
            
            # Load defect detection model
            defect_full_path = os.path.abspath(self.defect_model_path)
            print(f"Attempting to load defect model from: {defect_full_path}")
            
            if os.path.exists(self.defect_model_path):
                print(f"✅ Defect model found at: {self.defect_model_path}")
                self.defect_model = YOLO(self.defect_model_path)
                print(f"✅ Defect detection model loaded successfully")
                
                # Update active model info
                global active_model_info
                model_path = Path(self.defect_model_path)
                dir_name = "updated_defect" if "updated_defect" in str(model_path) else "defects"
                with model_lock:
                    active_model_info = {
                        "name": model_path.name,
                        "path": str(model_path),
                        "dir": dir_name,
                        "loaded": True,
                        "selected_at": None
                    }
            else:
                print(f"⚠️ Defect model not found at {self.defect_model_path}")
                print("   Stage 2 (defect detection) will be unavailable")
            
            # Check if at least one model loaded
            if self.transformer_model is None and self.defect_model is None:
                print("❌ No models loaded! Please check model paths.")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to load models: {e}")
            print("Please ensure you have:")
            print("1. Trained the models using train_transformer_defects.py")
            print("2. Model files in weights/segment/best.pt and weights/defects/best.pt")
            print("3. Proper ultralytics installation: pip install ultralytics")
            import traceback
            traceback.print_exc()
            return False
    
    def detect_defects_two_stage(self, image: np.ndarray, confidence_threshold: float = 0.25, 
                                image_name: str = "thermal_image") -> TwoStageDetectionResult:
        """
        Two-stage transformer defect detection
        
        Stage 1: Segment transformer from thermal image
        Stage 2: Detect defects within segmented transformer region
        
        Args:
            image: Input thermal image
            confidence_threshold: Detection confidence threshold
            image_name: Name of the image being processed
            
        Returns:
            TwoStageDetectionResult: Complete two-stage detection results
        """
        try:
            if not self.transformer_model and not self.defect_model:
                print("Models not loaded, attempting to reload...")
                if not self._load_models():
                    raise HTTPException(status_code=500, detail="Models not loaded and failed to initialize")
                print("Models reloaded successfully")
            
            start_time = datetime.now()
            print(f"🚀 Starting two-stage detection on {image_name}...")
            
            # Get image dimensions
            height, width = image.shape[:2]
            image_size = [width, height]
            
            # STAGE 1: Segment Transformer
            print("   🎯 Stage 1: Segmenting transformer...")
            transformer_crop, transformer_mask, stage1_info = self._segment_transformer(image, confidence_threshold)
            
            # Initialize stage2 info and detections
            stage2_info_dict = {"status": "no_defects_detected", "defect_count": 0, "classes_detected": []}
            defects = []
            
            # STAGE 2: Detect Defects (only if transformer was found)
            if stage1_info.get("status") == "transformer_detected" and transformer_crop is not None:
                print(f"   ✅ Transformer detected (confidence: {stage1_info['confidence']:.2f})")
                print("   🔍 Stage 2: Detecting defects...")
                defects, stage2_info_dict = self._detect_defects(transformer_crop, confidence_threshold)
                print(f"   🎯 Found {stage2_info_dict['defect_count']} defects")
            else:
                print(f"   ❌ Transformer not detected - skipping defect detection")
            
            # Overlay results on original image
            annotated_image = self._overlay_results(image, stage1_info, defects)
            
            # Convert detections to API format
            api_detections = []
            total_severity = 0.0
            
            for defect in defects:
                api_detection = Detection(
                    class_id=defect['class_id'],
                    class_name=defect['class_name'],
                    confidence=defect['confidence'],
                    bbox=defect['bbox'],
                    area=defect['area'],
                    color=list(defect['color'])
                )
                api_detections.append(api_detection)
                
                # Calculate severity based on defect class
                if "Overload" in defect['class_name']:
                    severity = defect['confidence'] * 1.0  # Critical
                elif "Loose Joint" in defect['class_name']:
                    severity = defect['confidence'] * 0.8  # High
                else:
                    severity = defect['confidence'] * 0.5  # Medium
                
                total_severity += severity
            
            # Calculate overall metrics
            total_detections = len(api_detections)
            overall_severity = total_severity / total_detections if total_detections > 0 else 0.0
            
            # Determine severity level
            if stage1_info.get("status") != "transformer_detected":
                severity_level = "NO_TRANSFORMER"
            elif total_detections == 0:
                severity_level = "NORMAL"
            elif overall_severity > 0.8:
                severity_level = "CRITICAL"
            elif overall_severity > 0.5:
                severity_level = "HIGH"
            elif overall_severity > 0.3:
                severity_level = "MEDIUM"
            else:
                severity_level = "LOW"
            
            # Convert annotated image to base64
            _, buffer = cv2.imencode('.jpg', annotated_image)
            annotated_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Calculate processing time
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            print(f"✅ Two-stage detection complete! Found {total_detections} defects in {processing_time:.2f}s")
            
            # Get active model info
            with model_lock:
                active_model_data = {
                    "name": active_model_info.get("name"),
                    "path": active_model_info.get("path"),
                    "dir": active_model_info.get("dir"),
                    "loaded": active_model_info.get("loaded", False)
                }
            
            print(f"🤖 Using defect model: {active_model_data['name']} ({active_model_data['dir']})")
            
            # Create response objects
            transformer_info = TransformerInfo(**stage1_info)
            defect_info = DefectInfo(**stage2_info_dict)
            
            return TwoStageDetectionResult(
                success=True,
                stage1_info=transformer_info,
                stage2_info=defect_info,
                detections=api_detections,
                total_detections=total_detections,
                severity_level=severity_level,
                severity_score=overall_severity,
                confidence_threshold=confidence_threshold,
                processing_time=processing_time,
                annotated_image_base64=annotated_base64,
                image_name=image_name,
                image_size=image_size,
                active_model=active_model_data
            )
            
        except Exception as e:
            print(f"❌ Error in two-stage detection: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Two-stage detection failed: {str(e)}")
    
    def _segment_transformer(self, image: np.ndarray, confidence_threshold: float):
        """Stage 1: Segment transformer from image"""
        try:
            if not self.transformer_model:
                return None, None, {"status": "transformer_model_not_loaded"}
            
            # Run transformer segmentation
            results = self.transformer_model(image, conf=confidence_threshold, verbose=False)
            
            if not results or len(results) == 0:
                return None, None, {"status": "no_transformer_detected"}
            
            result = results[0]
            
            if result.boxes is None or len(result.boxes) == 0:
                return None, None, {"status": "no_transformer_detected"}
            
            # Get the transformer with highest confidence
            confidences = result.boxes.conf.cpu().numpy()
            best_idx = np.argmax(confidences)
            
            # Get bounding box coordinates
            box = result.boxes.xyxy[best_idx].cpu().numpy().astype(int)
            x1, y1, x2, y2 = box
            confidence = confidences[best_idx]
            
            # Get segmentation mask if available
            transformer_mask = None
            if result.masks is not None and len(result.masks) > best_idx:
                mask_data = result.masks.data[best_idx].cpu().numpy()
                transformer_mask = (mask_data * 255).astype(np.uint8)
                
                if transformer_mask.shape != image.shape[:2]:
                    transformer_mask = cv2.resize(transformer_mask, (image.shape[1], image.shape[0]))
            
            # Crop transformer region with padding
            padding = 20
            x1_crop = max(0, x1 - padding)
            y1_crop = max(0, y1 - padding)
            x2_crop = min(image.shape[1], x2 + padding)
            y2_crop = min(image.shape[0], y2 + padding)
            
            cropped_transformer = image[y1_crop:y2_crop, x1_crop:x2_crop]
            
            stage1_info = {
                "status": "transformer_detected",
                "confidence": float(confidence),
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "crop_bbox": [int(x1_crop), int(y1_crop), int(x2_crop), int(y2_crop)],
                "transformer_area": int((x2 - x1) * (y2 - y1))
            }
            
            return cropped_transformer, transformer_mask, stage1_info
            
        except Exception as e:
            print(f"Error in transformer segmentation: {str(e)}")
            return None, None, {"status": "error", "message": str(e)}
    
    def _detect_defects(self, transformer_image: np.ndarray, confidence_threshold: float):
        """Stage 2: Detect defects within segmented transformer"""
        try:
            if not self.defect_model:
                return [], {"status": "defect_model_not_loaded", "defect_count": 0, "classes_detected": []}
            
            # Run defect detection on cropped transformer
            results = self.defect_model(transformer_image, conf=confidence_threshold, verbose=False)
            
            if not results or len(results) == 0:
                return [], {"status": "no_defects_detected", "defect_count": 0, "classes_detected": []}
            
            result = results[0]
            
            if result.boxes is None or len(result.boxes) == 0:
                return [], {"status": "no_defects_detected", "defect_count": 0, "classes_detected": []}
            
            defects = []
            
            # Process each detected defect
            boxes = result.boxes.xyxy.cpu().numpy().astype(int)
            confidences = result.boxes.conf.cpu().numpy()
            class_ids = result.boxes.cls.cpu().numpy().astype(int)
            
            for i, (box, conf, cls_id) in enumerate(zip(boxes, confidences, class_ids)):
                x1, y1, x2, y2 = box
                
                defect = {
                    "id": i,
                    "class_id": int(cls_id),
                    "class_name": self.defect_classes[cls_id] if cls_id < len(self.defect_classes) else f"Class_{cls_id}",
                    "confidence": float(conf),
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "area": int((x2 - x1) * (y2 - y1)),
                    "color": self.colors.get(cls_id, (255, 255, 255))
                }
                
                defects.append(defect)
            
            # Sort defects by confidence
            defects.sort(key=lambda x: x['confidence'], reverse=True)
            
            stage2_info = {
                "status": "defects_detected",
                "defect_count": len(defects),
                "classes_detected": list(set([d['class_name'] for d in defects]))
            }
            
            return defects, stage2_info
            
        except Exception as e:
            print(f"Error in defect detection: {str(e)}")
            return [], {"status": "error", "defect_count": 0, "classes_detected": []}
    
    def _overlay_results(self, original_image: np.ndarray, stage1_info: Dict, defects: List[Dict]) -> np.ndarray:
        """Overlay detection results on original image"""
        annotated = original_image.copy()
        
        # Draw transformer bounding box if detected
        if stage1_info.get("status") == "transformer_detected" and stage1_info.get("bbox"):
            x1, y1, x2, y2 = stage1_info["bbox"]
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(annotated, f"Transformer ({stage1_info['confidence']:.2f})",
                       (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Overlay defects on original image coordinates
        if defects and stage1_info.get("status") == "transformer_detected":
            crop_x1, crop_y1, crop_x2, crop_y2 = stage1_info["crop_bbox"]
            
            for defect in defects:
                # Convert defect coordinates from cropped image to original
                dx1, dy1, dx2, dy2 = defect["bbox"]
                
                orig_x1 = crop_x1 + dx1
                orig_y1 = crop_y1 + dy1
                orig_x2 = crop_x1 + dx2
                orig_y2 = crop_y1 + dy2
                
                # Draw defect bounding box
                color = defect["color"]
                cv2.rectangle(annotated, (orig_x1, orig_y1), (orig_x2, orig_y2), color, 2)
                
                # Create label
                label = f"{defect['class_name']} ({defect['confidence']:.2f})"
                label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                
                # Draw label background
                cv2.rectangle(annotated, 
                            (orig_x1, orig_y1 - label_size[1] - 10),
                            (orig_x1 + label_size[0], orig_y1),
                            color, -1)
                
                # Draw label text
                cv2.putText(annotated, label,
                          (orig_x1, orig_y1 - 5),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return annotated

# Initialize the two-stage detection system (this happens when the server starts)
detector = TwoStageTransformerDetector()

# Training Helper Functions
def prepare_training_dataset(new_dataset_path: Path, base_dataset_path: Path, temp_dir: Path) -> Dict[str, Any]:
    """
    Prepare combined training dataset by merging new_dataset with existing training data.
    
    Args:
        new_dataset_path: Path to new_dataset (images/ and labels/)
        base_dataset_path: Path to Transformer Defects/ (contains train/valid/test)
        temp_dir: Temporary directory for merged dataset
        
    Returns:
        Dictionary with dataset info and paths
    """
    
    try:
        # Create temp directory structure
        temp_train_images = temp_dir / "train" / "images"
        temp_train_labels = temp_dir / "train" / "labels"
        temp_train_images.mkdir(parents=True, exist_ok=True)
        temp_train_labels.mkdir(parents=True, exist_ok=True)
        
        # Copy validation and test as-is (symlink for efficiency)
        for split in ["valid", "test"]:
            src_dir = base_dataset_path / split
            if src_dir.exists():
                dst_dir = temp_dir / split
                if dst_dir.exists():
                    shutil.rmtree(dst_dir)
                shutil.copytree(src_dir, dst_dir, symlinks=True)
        
        # Copy base training data
        base_train = base_dataset_path / "train"
        if base_train.exists():
            for img_path in (base_train / "images").glob("*"):
                shutil.copy2(img_path, temp_train_images / img_path.name)
            for lbl_path in (base_train / "labels").glob("*"):
                shutil.copy2(lbl_path, temp_train_labels / lbl_path.name)
        
        base_train_count = len(list(temp_train_images.glob("*")))
        
        # Add new dataset to training set
        new_images = new_dataset_path / "images"
        new_labels = new_dataset_path / "labels"
        new_count = 0
        
        if new_images.exists() and new_labels.exists():
            for img_path in new_images.glob("*"):
                shutil.copy2(img_path, temp_train_images / img_path.name)
                new_count += 1
            for lbl_path in new_labels.glob("*"):
                shutil.copy2(lbl_path, temp_train_labels / lbl_path.name)
        
        total_train_count = len(list(temp_train_images.glob("*")))
        
        # Create data.yaml
        data_yaml = temp_dir / "data.yaml"
        yaml_content = f"""# Combined dataset for retraining
path: {temp_dir.absolute()}
train: train/images
val: valid/images
test: test/images

# Classes
nc: 6
names: ['Full Wire Overload PF', 'Loose Joint F', 'Loose Joint PF', 'Point Overload F', 'Point Overload PF', 'Transformer Overload']
"""
        with open(data_yaml, 'w') as f:
            f.write(yaml_content)
        
        return {
            "success": True,
            "temp_dir": str(temp_dir),
            "data_yaml": str(data_yaml),
            "base_train_count": base_train_count,
            "new_dataset_count": new_count,
            "total_train_count": total_train_count,
            "warnings": [] if new_count > 0 else ["No new dataset images found - training with base dataset only"]
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

def train_model_background(config: Dict[str, Any]):
    """
    Background training function that runs in a separate thread.
    
    Args:
        config: Training configuration dictionary
    """
    global training_state
    
    try:
        # Update status
        with training_lock:
            training_state["status"] = "running"
            training_state["started_at"] = datetime.now().isoformat()
            training_state["current_epoch"] = 0
            training_state["metrics"] = []
        
        # Prepare dataset
        new_dataset_path = Path(config["new_dataset_path"])
        base_dataset_path = Path(config["base_dataset_path"])
        temp_dir = Path(config["temp_dir"])
        
        dataset_info = prepare_training_dataset(new_dataset_path, base_dataset_path, temp_dir)
        
        if not dataset_info["success"]:
            raise Exception(f"Dataset preparation failed: {dataset_info.get('error')}")
        
        # Store warnings
        with training_lock:
            training_state["warnings"] = dataset_info.get("warnings", [])
        
        # Load base model (defect detection model)
        base_model_path = config.get("base_model_path", "weights/defects/best.pt")
        
        if not os.path.exists(base_model_path):
            # Try alternative paths
            for alt_path in ["../weights/defects/best.pt", "weights/defects/best.pt"]:
                if os.path.exists(alt_path):
                    base_model_path = alt_path
                    break
        
        print(f"Loading base model: {base_model_path}")
        model = YOLO(base_model_path)
        
        # Training parameters
        epochs = config["epochs"]
        batch_size = config["batch_size"]
        lr = config["learning_rate"]
        img_size = config["image_size"]
        seed = config.get("seed")
        
        # Set seed for reproducibility
        if seed is not None:
            import random
            import torch
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(seed)
        
        # Prepare output directory
        output_dir = Path(config["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        weights_filename = f"weights_{timestamp}.pt"
        
        # Custom callback to update training state in real-time
        def on_train_epoch_end(trainer):
            """Called at the end of each training epoch"""
            try:
                epoch = trainer.epoch + 1  # YOLO epochs are 0-indexed
                
                # Extract metrics from trainer
                metrics_dict = {}
                if hasattr(trainer, 'metrics') and trainer.metrics:
                    metrics_dict = trainer.metrics
                elif hasattr(trainer, 'validator') and hasattr(trainer.validator, 'metrics'):
                    metrics_dict = trainer.validator.metrics
                
                # Build epoch metrics
                epoch_metrics = {
                    "epoch": epoch,
                    "train_loss": float(trainer.loss.item()) if hasattr(trainer, 'loss') else None,
                    "val_loss": None,
                    "precision": None,
                    "recall": None,
                    "mAP50": None,
                    "mAP50_95": None
                }
                
                # Try to extract validation metrics
                if metrics_dict:
                    # YOLO11 metric keys
                    epoch_metrics["precision"] = float(metrics_dict.get('metrics/precision(B)', 0))
                    epoch_metrics["recall"] = float(metrics_dict.get('metrics/recall(B)', 0))
                    epoch_metrics["mAP50"] = float(metrics_dict.get('metrics/mAP50(B)', 0))
                    epoch_metrics["mAP50_95"] = float(metrics_dict.get('metrics/mAP50-95(B)', 0))
                
                # Update global state
                with training_lock:
                    training_state["current_epoch"] = epoch
                    
                    # Add to metrics list
                    if len(training_state["metrics"]) < epoch:
                        training_state["metrics"].append(epoch_metrics)
                    else:
                        training_state["metrics"][epoch - 1] = epoch_metrics
                
                print(f"📊 Epoch {epoch}/{config['epochs']} - mAP50: {epoch_metrics.get('mAP50', 0):.3f}")
                
            except Exception as e:
                print(f"⚠️ Error in epoch callback: {e}")
        
        # Add callback to model
        from ultralytics.utils.callbacks import default_callbacks
        
        # Train the model
        print(f"Starting training: {epochs} epochs, batch_size={batch_size}, lr={lr}")
        
        # Add custom callbacks
        model.add_callback("on_train_epoch_end", on_train_epoch_end)
        
        results = model.train(
            data=dataset_info["data_yaml"],
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            lr0=lr,
            project=str(output_dir),
            name="training_run",
            exist_ok=True,
            verbose=True,
            patience=10,
            save=True,
            save_period=5,
            plots=True,
            device=0 if config.get("use_gpu", True) else "cpu"
        )
        
        # Extract metrics from results
        if hasattr(results, 'results_dict'):
            metrics_data = []
            for epoch in range(epochs):
                epoch_metrics = {
                    "epoch": epoch + 1,
                    "train_loss": None,
                    "val_loss": None,
                    "precision": None,
                    "recall": None,
                    "mAP50": None,
                    "mAP50_95": None
                }
                
                # Try to extract metrics from results
                # YOLO stores metrics in CSV files
                csv_path = output_dir / "training_run" / "results.csv"
                if csv_path.exists():
                    import pandas as pd
                    df = pd.read_csv(csv_path)
                    df.columns = df.columns.str.strip()
                    
                    if epoch < len(df):
                        row = df.iloc[epoch]
                        epoch_metrics["train_loss"] = float(row.get("train/box_loss", 0))
                        epoch_metrics["val_loss"] = float(row.get("val/box_loss", 0))
                        epoch_metrics["precision"] = float(row.get("metrics/precision(B)", 0))
                        epoch_metrics["recall"] = float(row.get("metrics/recall(B)", 0))
                        epoch_metrics["mAP50"] = float(row.get("metrics/mAP50(B)", 0))
                        epoch_metrics["mAP50_95"] = float(row.get("metrics/mAP50-95(B)", 0))
                
                metrics_data.append(epoch_metrics)
                
                # Update state progressively
                with training_lock:
                    training_state["current_epoch"] = epoch + 1
                    training_state["metrics"] = metrics_data
        
        # Copy best weights to output directory with timestamp
        best_weights_src = output_dir / "training_run" / "weights" / "best.pt"
        best_weights_dst = output_dir / weights_filename
        
        if best_weights_src.exists():
            shutil.copy2(best_weights_src, best_weights_dst)
            
            # Create/update 'latest' symlink
            latest_link = output_dir / "latest.pt"
            if latest_link.exists() or latest_link.is_symlink():
                latest_link.unlink()
            
            # For Windows, copy instead of symlink
            try:
                latest_link.symlink_to(best_weights_dst)
            except OSError:
                shutil.copy2(best_weights_dst, latest_link)
            
            weights_path = str(best_weights_dst)
        else:
            raise Exception("Best weights not found after training")
        
        # Save metrics to JSON
        metrics_json = output_dir / f"metrics_{timestamp}.json"
        with open(metrics_json, 'w') as f:
            json.dump({
                "training_config": config,
                "dataset_info": dataset_info,
                "metrics": metrics_data,
                "weights_path": weights_path
            }, f, indent=2)
        
        # Update final state
        with training_lock:
            training_state["status"] = "done"
            training_state["finished_at"] = datetime.now().isoformat()
            training_state["weights_path"] = weights_path
            training_state["current_epoch"] = epochs
        
        print(f"✅ Training completed successfully!")
        print(f"   Weights: {weights_path}")
        print(f"   Metrics: {metrics_json}")
        
    except Exception as e:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"❌ Training failed: {error_msg}")
        
        with training_lock:
            training_state["status"] = "error"
            training_state["error"] = str(e)
            training_state["finished_at"] = datetime.now().isoformat()
    
    finally:
        # Cleanup temp directory
        try:
            if "temp_dir" in config and Path(config["temp_dir"]).exists():
                shutil.rmtree(config["temp_dir"])
                print(f"🧹 Cleaned up temp directory: {config['temp_dir']}")
        except Exception as cleanup_error:
            print(f"⚠️ Failed to cleanup temp directory: {cleanup_error}")

# API Routes
@app.get("/")
async def root():
    return {"message": "Two-Stage Transformer Defect Detection API", "version": "5.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "transformer_model_loaded": detector.transformer_model is not None,
        "defect_model_loaded": detector.defect_model is not None,
        "transformer_model_path": detector.transformer_model_path,
        "defect_model_path": detector.defect_model_path,
        "service_version": detector.model_version,
        "supported_defect_classes": detector.defect_classes,
        "detection_mode": "two_stage",
        "ultralytics_available": True
    }

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify service is running"""
    return {
        "message": "FastAPI two-stage detection service is running", 
        "timestamp": datetime.now().isoformat(),
        "transformer_model_status": "loaded" if detector.transformer_model else "not_loaded",
        "defect_model_status": "loaded" if detector.defect_model else "not_loaded"
    }

@app.post("/detect-thermal-anomalies", response_model=TwoStageDetectionResult)
async def detect_thermal_anomalies(
    file: UploadFile = File(..., description="Thermal image to analyze"),
    confidence_threshold: Optional[float] = 0.25
):
    """
    Main endpoint for two-stage transformer defect detection
    Stage 1: Segments transformer from thermal image
    Stage 2: Detects defects within segmented transformer region
    This endpoint processes a single thermal image and returns detected defects
    """
    try:
        # Validate confidence threshold
        confidence_threshold = max(0.1, min(1.0, confidence_threshold))
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file size (max 10MB)
        file_size = 0
        image_data = await file.read()
        file_size = len(image_data)
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        if file_size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
        # Read and decode image
        try:
            image_np = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(image_np, cv2.IMREAD_COLOR)
            
            if image is None:
                raise HTTPException(status_code=400, detail="Invalid image format or corrupted file")
            
            print(f"Image loaded: {image.shape} - {file.filename}")
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")
        
        # Get image name
        image_name = file.filename or "thermal_image.jpg"
        
        # Run two-stage detection
        result = detector.detect_defects_two_stage(
            image=image, 
            confidence_threshold=confidence_threshold,
            image_name=image_name
        )
        
        return result
        
    except Exception as e:
        print(f"Error in detection endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-annotations")
async def process_annotations(
    annotations: List[EditableAnnotation],
    image_id: Optional[str] = None
):
    """
    Process user-edited annotations and return updated annotation data
    This endpoint handles user edits to detected anomalies
    """
    try:
        processed_annotations = []
        
        for annotation in annotations:
            # Add timestamp if not present
            if not annotation.metadata.timestamp:
                annotation.metadata.timestamp = datetime.now().isoformat()
            
            # Validate bbox coordinates
            x1, y1, x2, y2 = annotation.bbox
            if x2 <= x1 or y2 <= y1:
                continue  # Skip invalid bounding boxes
            
            processed_annotations.append(annotation)
        
        return {
            "success": True,
            "processed_annotations": processed_annotations,
            "total_annotations": len(processed_annotations),
            "image_id": image_id,
            "processing_time": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Annotation processing failed: {str(e)}")

@app.post("/tools/retrain/prepare-dataset", response_model=RetrainingDatasetSummary)
async def prepare_retraining_dataset():
    """
    Prepare a retraining dataset by fetching images and annotations from the backend API.
    
    This endpoint:
    1. Fetches all images from the backend
    2. Filters out images with imageType === "ANNOTATED"
    3. Downloads images to tf_model/new_dataset/images/
    4. Fetches annotations and converts them to YOLO format
    5. Saves labels to tf_model/new_dataset/labels/
    
    Returns:
        RetrainingDatasetSummary: Summary of the preparation process
    """
    try:
        # Backend API base URL (from CORS config)
        backend_url = "http://localhost:8080"
        
        # Output directories
        base_dir = Path(__file__).parent / "new_dataset"
        images_dir = base_dir / "images"
        labels_dir = base_dir / "labels"
        
        # Ensure directories exist
        images_dir.mkdir(parents=True, exist_ok=True)
        labels_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"🚀 Starting retraining dataset preparation...")
        print(f"   Output directory: {base_dir}")
        
        # Initialize counters
        total_images = 0
        skipped_annotated = 0
        downloaded = 0
        labeled = 0
        errors = []
        
        # Concurrency control
        semaphore = Semaphore(5)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Step 1: Fetch all images
            print("   📥 Fetching all images from backend...")
            try:
                response = await client.get(f"{backend_url}/api/images")
                response.raise_for_status()
                images = response.json()
                total_images = len(images)
                print(f"   ✅ Found {total_images} images")
            except Exception as e:
                print(f"   ❌ Failed to fetch images: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to fetch images: {str(e)}")
            
            # Step 2: Filter out ANNOTATED images
            filtered_images = []
            for img in images:
                if img.get("imageType") == "ANNOTATED":
                    skipped_annotated += 1
                    print(f"   ⏭️  Skipping annotated image: {img.get('fileName', 'unknown')}")
                else:
                    filtered_images.append(img)
            
            print(f"   📊 Processing {len(filtered_images)} images ({skipped_annotated} annotated images skipped)")
            
            # Helper function to download and process a single image
            async def process_image(img: Dict[str, Any]):
                nonlocal downloaded, labeled
                
                async with semaphore:
                    image_id = img.get("id")
                    file_path = img.get("filePath", "")
                    
                    # Derive fileName from filePath (handle nested paths)
                    if file_path:
                        file_name = os.path.basename(file_path)
                    else:
                        file_name = img.get("fileName", f"image_{image_id}.jpg")
                    
                    # Step 3: Download image with retries
                    max_retries = 3
                    retry_delay = 1.0
                    image_downloaded = False
                    image_width = None
                    image_height = None
                    crop_offset_x = 0  # Track crop offset for annotation adjustment
                    crop_offset_y = 0
                    
                    for retry in range(max_retries):
                        try:
                            print(f"   🔽 Downloading image {file_name} (attempt {retry + 1}/{max_retries})...")
                            download_response = await client.get(
                                f"{backend_url}/api/images/download/{file_name}",
                                follow_redirects=True
                            )
                            download_response.raise_for_status()
                            
                            # Read image into memory first
                            image_bytes = download_response.content
                            image_np = np.frombuffer(image_bytes, np.uint8)
                            image_data = cv2.imdecode(image_np, cv2.IMREAD_COLOR)
                            
                            if image_data is None:
                                raise Exception("Failed to decode image")
                            
                            original_height, original_width = image_data.shape[:2]
                            print(f"   ✅ Downloaded: {file_name} ({original_width}x{original_height})")
                            
                            # Step 3.5: Segment transformer and apply binary mask
                            if detector.transformer_model is not None:
                                try:
                                    print(f"   🎯 Segmenting transformer from {file_name}...")
                                    
                                    # Run transformer segmentation
                                    results = detector.transformer_model(image_data, conf=0.25, verbose=False)
                                    
                                    if results and len(results) > 0:
                                        result = results[0]
                                        
                                        if result.boxes is not None and len(result.boxes) > 0:
                                            # Get the transformer with highest confidence
                                            confidences = result.boxes.conf.cpu().numpy()
                                            best_idx = np.argmax(confidences)
                                            confidence = confidences[best_idx]
                                            
                                            # Get bounding box
                                            box = result.boxes.xyxy[best_idx].cpu().numpy().astype(int)
                                            x1, y1, x2, y2 = box
                                            
                                            # Create binary mask
                                            mask = np.zeros(image_data.shape[:2], dtype=np.uint8)
                                            
                                            # Check if segmentation mask is available
                                            if result.masks is not None and len(result.masks) > best_idx:
                                                # Use segmentation mask
                                                mask_data = result.masks.data[best_idx].cpu().numpy()
                                                
                                                # Resize mask to match image dimensions if needed
                                                if mask_data.shape != image_data.shape[:2]:
                                                    mask = cv2.resize(mask_data, (original_width, original_height))
                                                    mask = (mask * 255).astype(np.uint8)
                                                else:
                                                    mask = (mask_data * 255).astype(np.uint8)
                                                
                                                print(f"   ✅ Using segmentation mask (confidence: {confidence:.2f})")
                                            else:
                                                # Fallback: Use bounding box as mask
                                                mask[y1:y2, x1:x2] = 255
                                                print(f"   ℹ️  Using bounding box mask (confidence: {confidence:.2f})")
                                            
                                            # Apply binary mask to extract ROI
                                            # Create 3-channel mask for color image
                                            mask_3ch = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
                                            
                                            # Apply mask (keep transformer region, black out background)
                                            segmented_image = cv2.bitwise_and(image_data, mask_3ch)
                                            
                                            # Optional: Crop to bounding box to save space
                                            # Add some padding
                                            padding = 20
                                            x1_crop = max(0, x1 - padding)
                                            y1_crop = max(0, y1 - padding)
                                            x2_crop = min(original_width, x2 + padding)
                                            y2_crop = min(original_height, y2 + padding)
                                            
                                            # Store crop offset for annotation adjustment
                                            crop_offset_x = x1_crop
                                            crop_offset_y = y1_crop
                                            
                                            # Crop the segmented image
                                            segmented_image = segmented_image[y1_crop:y2_crop, x1_crop:x2_crop]
                                            
                                            # Update dimensions for label conversion
                                            image_height, image_width = segmented_image.shape[:2]
                                            
                                            # Use segmented image
                                            image_data = segmented_image
                                            
                                            print(f"   ✅ Segmented transformer region: {image_width}x{image_height} (offset: {crop_offset_x}, {crop_offset_y})")
                                        else:
                                            print(f"   ⚠️  No transformer detected, using original image")
                                            image_height, image_width = original_height, original_width
                                    else:
                                        print(f"   ⚠️  Segmentation failed, using original image")
                                        image_height, image_width = original_height, original_width
                                        
                                except Exception as seg_error:
                                    print(f"   ⚠️  Segmentation error: {str(seg_error)}, using original image")
                                    image_height, image_width = original_height, original_width
                            else:
                                print(f"   ℹ️  Transformer model not loaded, using original image")
                                image_height, image_width = original_height, original_width
                            
                            # Save the (potentially segmented) image
                            image_path = images_dir / file_name
                            cv2.imwrite(str(image_path), image_data)
                            
                            downloaded += 1
                            image_downloaded = True
                            break
                            
                        except Exception as e:
                            if retry < max_retries - 1:
                                wait_time = retry_delay * (2 ** retry)  # Exponential backoff
                                print(f"   ⚠️  Retry after {wait_time}s due to: {str(e)}")
                                await asyncio.sleep(wait_time)
                            else:
                                print(f"   ❌ Failed to download {file_name}: {str(e)}")
                                errors.append(RetrainingDatasetError(
                                    imageId=str(image_id),
                                    stage="download",
                                    message=str(e)
                                ))
                                return
                    
                    if not image_downloaded or image_width is None or image_height is None:
                        return
                    
                    # Step 4: Fetch annotations for this image
                    try:
                        print(f"   📝 Fetching annotations for image {image_id}...")
                        
                        # Fetch all final annotations (including correctly inferred ones) and filter by imageId
                        annotations_response = await client.get(
                            f"{backend_url}/api/annotations/all"
                        )
                        
                        # Note: The endpoint might return 404 or empty list if no annotations
                        if annotations_response.status_code == 404:
                            annotations = []
                            print(f"   ℹ️  No annotations found (404)")
                        else:
                            annotations_response.raise_for_status()
                            all_annotations = annotations_response.json()
                            
                            # Filter annotations for this specific image
                            annotations = [ann for ann in all_annotations if ann.get("imageId") == image_id]
                            print(f"   ℹ️  Found {len(annotations)} annotations for image {image_id} (from {len(all_annotations)} total)")
                        
                        # Alternative: Try image-specific endpoint if no annotations found
                        if not annotations or len(annotations) == 0:
                            try:
                                print(f"   🔄 Trying alternative endpoint: /api/annotations/image/{image_id}")
                                alt_response = await client.get(f"{backend_url}/api/annotations/image/{image_id}")
                                if alt_response.status_code == 200:
                                    annotations = alt_response.json()
                                    print(f"   ✅ Found {len(annotations)} annotations from alternative endpoint")
                            except Exception as alt_error:
                                print(f"   ℹ️  Alternative endpoint also returned no annotations: {str(alt_error)}")
                                pass  # Continue with empty annotations
                        
                        # Convert annotations to YOLO format
                        base_name = os.path.splitext(file_name)[0]
                        label_path = labels_dir / f"{base_name}.txt"
                        
                        if annotations and len(annotations) > 0:
                            yolo_lines = []
                            
                            for ann in annotations:
                                # Get bounding box coordinates (x1, y1, x2, y2)
                                bbox_x1 = ann.get("bboxX1")
                                bbox_y1 = ann.get("bboxY1")
                                bbox_x2 = ann.get("bboxX2")
                                bbox_y2 = ann.get("bboxY2")
                                
                                if None in [bbox_x1, bbox_y1, bbox_x2, bbox_y2]:
                                    continue
                                
                                # Adjust coordinates for crop offset (if image was segmented and cropped)
                                adjusted_x1 = bbox_x1 - crop_offset_x
                                adjusted_y1 = bbox_y1 - crop_offset_y
                                adjusted_x2 = bbox_x2 - crop_offset_x
                                adjusted_y2 = bbox_y2 - crop_offset_y
                                
                                # Check if annotation is within the cropped region
                                if adjusted_x2 <= 0 or adjusted_y2 <= 0 or adjusted_x1 >= image_width or adjusted_y1 >= image_height:
                                    print(f"   ⏭️  Skipping annotation outside cropped region")
                                    continue
                                
                                # Clip to image boundaries
                                adjusted_x1 = max(0, adjusted_x1)
                                adjusted_y1 = max(0, adjusted_y1)
                                adjusted_x2 = min(image_width, adjusted_x2)
                                adjusted_y2 = min(image_height, adjusted_y2)
                                
                                # Calculate width and height
                                w = adjusted_x2 - adjusted_x1
                                h = adjusted_y2 - adjusted_y1
                                
                                # Skip if annotation becomes too small after clipping
                                if w <= 0 or h <= 0:
                                    print(f"   ⏭️  Skipping invalid annotation after adjustment")
                                    continue
                                
                                # Convert to YOLO normalized format
                                x_center = (adjusted_x1 + w / 2) / image_width
                                y_center = (adjusted_y1 + h / 2) / image_height
                                w_norm = w / image_width
                                h_norm = h / image_height
                                
                                # Format to 6 decimals
                                x_center = round(x_center, 6)
                                y_center = round(y_center, 6)
                                w_norm = round(w_norm, 6)
                                h_norm = round(h_norm, 6)
                                
                                # Get class ID or class name
                                class_id = ann.get("classId")
                                class_name = ann.get("className", "")
                                
                                # Use class_id if available, otherwise use class_name
                                class_identifier = class_id if class_id is not None else class_name
                                
                                # Create YOLO format line (without error type comment)
                                yolo_line = f"{class_identifier} {x_center} {y_center} {w_norm} {h_norm}"
                                
                                yolo_lines.append(yolo_line)
                            
                            # Write labels to file
                            async with aiofiles.open(label_path, 'w') as f:
                                await f.write('\n'.join(yolo_lines) + '\n')
                            
                            labeled += 1
                            print(f"   ✅ Created labels: {base_name}.txt ({len(yolo_lines)} annotations)")
                        else:
                            # Create empty label file
                            async with aiofiles.open(label_path, 'w') as f:
                                await f.write('')
                            
                            labeled += 1
                            print(f"   ℹ️  Created empty labels: {base_name}.txt (no annotations)")
                        
                    except Exception as e:
                        print(f"   ❌ Failed to process annotations for image {image_id}: {str(e)}")
                        errors.append(RetrainingDatasetError(
                            imageId=str(image_id),
                            stage="labels",
                            message=str(e)
                        ))
            
            # Process all images concurrently
            tasks = [process_image(img) for img in filtered_images]
            await asyncio.gather(*tasks)
        
        # Create summary
        summary = RetrainingDatasetSummary(
            totalImages=total_images,
            skippedAnnotated=skipped_annotated,
            downloaded=downloaded,
            labeled=labeled,
            errors=errors
        )
        
        print(f"\n✅ Dataset preparation complete!")
        print(f"   Total images: {total_images}")
        print(f"   Skipped annotated: {skipped_annotated}")
        print(f"   Downloaded: {downloaded}")
        print(f"   Labeled: {labeled}")
        print(f"   Errors: {len(errors)}")
        print(f"   Output: {base_dir}")
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Dataset preparation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Dataset preparation failed: {str(e)}")

# Retraining Endpoints

@app.post("/tools/retrain/start")
async def start_retraining(request: TrainingRequest):
    """
    Start model retraining in the background.
    
    This endpoint:
    1. Validates that new_dataset exists and has data
    2. Merges new_dataset with existing Transformer Defects/train data
    3. Starts training in a background thread
    4. Returns immediately with training ID
    
    The training progress can be monitored via:
    - GET /tools/retrain/status (polling)
    - GET /tools/retrain/logs/stream (SSE streaming)
    """
    global training_state
    
    # Check if training is already running
    with training_lock:
        if training_state["status"] == "running":
            raise HTTPException(
                status_code=409,
                detail="Training is already in progress. Stop the current training first or wait for it to complete."
            )
    
    # Validate paths
    new_dataset_path = Path("new_dataset")
    base_dataset_path = Path("Transformer Defects")
    
    if not new_dataset_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"new_dataset path not found: {new_dataset_path}"
        )
    
    if not base_dataset_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Base dataset path not found: {base_dataset_path}"
        )
    
    # Check that new_dataset has images
    new_images = new_dataset_path / "images"
    if not new_images.exists() or not list(new_images.glob("*")):
        raise HTTPException(
            status_code=400,
            detail="new_dataset/images is empty or does not exist. Run /tools/retrain/prepare-dataset first."
        )
    
    # Check that new_dataset has labels
    new_labels = new_dataset_path / "labels"
    if not new_labels.exists() or not list(new_labels.glob("*")):
        raise HTTPException(
            status_code=400,
            detail="new_dataset/labels is empty or does not exist. Run /tools/retrain/prepare-dataset first."
        )
    
    # Create temp directory for merged dataset
    temp_dir = Path(f"temp_training_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    
    # Prepare training configuration
    training_config = {
        "new_dataset_path": str(new_dataset_path),
        "base_dataset_path": str(base_dataset_path),
        "temp_dir": str(temp_dir),
        "base_model_path": request.base_model_path or "weights/defects/best.pt",
        "epochs": request.epochs,
        "batch_size": request.batch_size,
        "learning_rate": request.learning_rate,
        "image_size": request.image_size,
        "use_gpu": request.use_gpu,
        "seed": request.seed,
        "output_dir": request.output_dir or "weights/updated_defect"
    }
    
    # Reset training state
    with training_lock:
        training_state = {
            "status": "idle",
            "started_at": None,
            "finished_at": None,
            "current_epoch": 0,
            "total_epochs": request.epochs,
            "metrics": [],
            "weights_path": None,
            "error": None,
            "warnings": [],
            "config": training_config
        }
    
    # Start training in background thread
    training_executor.submit(train_model_background, training_config)
    
    # Wait a moment for training to initialize
    await asyncio.sleep(0.5)
    
    return {
        "message": "Training started successfully",
        "config": training_config,
        "status_endpoint": "/tools/retrain/status",
        "stream_endpoint": "/tools/retrain/logs/stream"
    }

@app.get("/tools/retrain/status", response_model=TrainingState)
async def get_training_status():
    """
    Get current training status and metrics.
    
    Returns:
        TrainingState with current status, epoch, metrics, etc.
    """
    with training_lock:
        return TrainingState(**training_state)

@app.get("/tools/retrain/logs/stream")
async def stream_training_logs(request: Request):
    """
    Stream training logs via Server-Sent Events (SSE).
    
    This endpoint provides real-time training progress updates.
    The client should connect and listen for events:
    
    ```javascript
    const eventSource = new EventSource('/tools/retrain/logs/stream');
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Epoch:', data.current_epoch, 'Status:', data.status);
    };
    ```
    
    Events are sent every 2 seconds with current training state.
    Connection closes automatically when training finishes or errors.
    """
    
    async def event_generator():
        """Generate SSE events with training status"""
        try:
            last_epoch = -1
            
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    print("Client disconnected from SSE stream")
                    break
                
                # Get current state
                with training_lock:
                    current_state = dict(training_state)
                
                status = current_state["status"]
                current_epoch = current_state["current_epoch"]
                
                # Send update if epoch changed or status changed
                if current_epoch != last_epoch or status in ["done", "error"]:
                    # Format as SSE
                    data = json.dumps({
                        "status": status,
                        "current_epoch": current_epoch,
                        "total_epochs": current_state["total_epochs"],
                        "metrics": current_state["metrics"][-1] if current_state["metrics"] else None,
                        "weights_path": current_state.get("weights_path"),
                        "error": current_state.get("error"),
                        "warnings": current_state.get("warnings", [])
                    })
                    
                    yield f"data: {data}\n\n"
                    last_epoch = current_epoch
                
                # Stop streaming if training finished
                if status in ["done", "error"]:
                    print(f"Training finished with status: {status}")
                    break
                
                # Wait before next update
                await asyncio.sleep(2)
                
        except asyncio.CancelledError:
            print("SSE stream cancelled")
        except Exception as e:
            print(f"SSE stream error: {e}")
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering in nginx
        }
    )

@app.get("/tools/models/list", response_model=ModelsListResponse)
async def list_models():
    """
    List all available defect detection models from both directories.
    
    Scans:
    - weights/updated_defect/ (retrained models)
    - weights/defects/ (base models)
    
    Returns sorted list (newest first) with active model info.
    """
    models = []
    base_dir = Path("weights")
    
    # Scan both directories for .pt files
    for model_dir in ["updated_defect", "defects"]:
        dir_path = base_dir / model_dir
        
        if not dir_path.exists():
            continue
        
        for pt_file in dir_path.glob("*.pt"):
            try:
                stat = pt_file.stat()
                models.append({
                    "name": pt_file.name,
                    "path": str(pt_file),
                    "dir": model_dir,
                    "size_bytes": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
            except Exception as e:
                print(f"⚠️ Error reading model file {pt_file}: {e}")
                continue
    
    # Sort by modified time (newest first)
    models.sort(key=lambda x: x["modified"], reverse=True)
    
    # Get active model info
    active_info = None
    with model_lock:
        if active_model_info["loaded"]:
            active_info = {
                "name": active_model_info["name"],
                "path": active_model_info["path"],
                "dir": active_model_info["dir"],
                "loaded": True,
                "selected_at": active_model_info.get("selected_at")
            }
    
    return {
        "models": models,
        "active_model": active_info
    }

@app.post("/tools/models/select", response_model=SelectModelResponse)
async def select_model(request: SelectModelRequest):
    """
    Select and load a defect detection model.
    
    Security: Only allows paths within weights/updated_defect/ or weights/defects/
    Validates file exists and is a .pt file.
    Persists selection to active_model.json for future server startups.
    """
    global active_model_info
    
    # Security: Validate path is within allowed directories
    model_path = Path(request.path)
    
    # Normalize path to prevent directory traversal
    try:
        resolved_path = model_path.resolve()
        allowed_dirs = [
            Path("weights/updated_defect").resolve(),
            Path("weights/defects").resolve()
        ]
        
        # Check if resolved path is within allowed directories
        is_allowed = any(
            str(resolved_path).startswith(str(allowed_dir))
            for allowed_dir in allowed_dirs
        )
        
        if not is_allowed:
            return {
                "ok": False,
                "active_model": None,
                "error": "Invalid model path. Must be in weights/updated_defect/ or weights/defects/"
            }
    except Exception as e:
        return {
            "ok": False,
            "active_model": None,
            "error": f"Invalid path: {str(e)}"
        }
    
    # Validate file exists and is .pt file
    if not model_path.exists():
        return {
            "ok": False,
            "active_model": None,
            "error": f"Model file not found: {request.path}"
        }
    
    if model_path.suffix != ".pt":
        return {
            "ok": False,
            "active_model": None,
            "error": "Model file must have .pt extension"
        }
    
    # Load the model
    try:
        with model_lock:
            # Unload current model
            if detector.defect_model is not None:
                del detector.defect_model
                detector.defect_model = None
            
            # Load new model
            from ultralytics import YOLO
            detector.defect_model = YOLO(str(model_path))
            detector.defect_model_path = str(model_path)
            
            # Determine directory
            dir_name = "updated_defect" if "updated_defect" in str(model_path) else "defects"
            
            # Update active model info
            active_model_info = {
                "name": model_path.name,
                "path": str(model_path),
                "dir": dir_name,
                "loaded": True,
                "selected_at": datetime.now().isoformat()
            }
            
            # Persist to file
            try:
                ACTIVE_MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
                with open(ACTIVE_MODEL_FILE, 'w') as f:
                    json.dump(active_model_info, f, indent=2)
            except Exception as e:
                print(f"⚠️ Warning: Could not persist active model: {e}")
            
            print(f"✅ Successfully switched to defect model: {model_path.name} from {dir_name}/")
            print(f"   Full path: {model_path}")
            print(f"   Model loaded and ready for detection!")
            
            return {
                "ok": True,
                "active_model": {
                    "name": active_model_info["name"],
                    "path": active_model_info["path"],
                    "dir": active_model_info["dir"],
                    "loaded": True,
                    "selected_at": active_model_info["selected_at"]
                },
                "error": None
            }
    
    except Exception as e:
        return {
            "ok": False,
            "active_model": None,
            "error": f"Failed to load model: {str(e)}"
        }

@app.get("/tools/models/active", response_model=ActiveModelInfo)
async def get_active_model():
    """Get information about the currently active defect detection model."""
    with model_lock:
        if not active_model_info["loaded"]:
            raise HTTPException(
                status_code=404,
                detail="No active model loaded"
            )
        
        return {
            "name": active_model_info["name"],
            "path": active_model_info["path"],
            "dir": active_model_info["dir"],
            "loaded": True,
            "selected_at": active_model_info.get("selected_at")
        }

@app.post("/tools/retrain/stop")
async def stop_retraining():
    """
    Stop the current training process (if running).
    
    Note: This implementation does not forcefully kill the training thread,
    as YOLO training cannot be safely interrupted mid-epoch. Instead, it marks
    the training as stopped and the training thread will complete the current
    epoch before exiting.
    
    For immediate termination, restart the FastAPI server.
    """
    global training_state
    
    with training_lock:
        if training_state["status"] != "running":
            raise HTTPException(
                status_code=400,
                detail=f"No training in progress. Current status: {training_state['status']}"
            )
        
        training_state["status"] = "stopped"
        training_state["finished_at"] = datetime.now().isoformat()
        training_state["error"] = "Training stopped by user"
    
    return {
        "message": "Training stop requested. The current epoch will complete before stopping.",
        "note": "For immediate termination, restart the server."
    }

if __name__ == "__main__":
    try:
        import uvicorn
    except ImportError:
        print("uvicorn not installed. Install with: pip install uvicorn")
        exit(1)
        
    print("🚀 Starting Two-Stage Transformer Defect Detection API...")
    
    # Load persisted active model if available
    if ACTIVE_MODEL_FILE.exists():
        try:
            with open(ACTIVE_MODEL_FILE, 'r') as f:
                persisted_info = json.load(f)
            
            model_path = Path(persisted_info["path"])
            if model_path.exists():
                with model_lock:
                    from ultralytics import YOLO
                    detector.defect_model = YOLO(str(model_path))
                    detector.defect_model_path = str(model_path)
                    active_model_info = persisted_info
                    active_model_info["loaded"] = True
                    print(f"✅ Loaded persisted active model: {model_path.name}")
            else:
                print(f"⚠️ Persisted model not found: {model_path}")
        except Exception as e:
            print(f"⚠️ Could not load persisted active model: {e}")
    
    print("🤖 Model Status:")
    print(f"   Stage 1 (Transformer Segmentation): {'✅ Loaded' if detector.transformer_model else '❌ Not Loaded'}")
    print(f"   Stage 2 (Defect Detection): {'✅ Loaded' if detector.defect_model else '❌ Not Loaded'}")
    
    if active_model_info["loaded"]:
        print(f"   Active Defect Model: {active_model_info['name']} ({active_model_info['dir']})")
    
    print("📱 Server will be available at:")
    print("   - http://localhost:8001")
    print("   - http://127.0.0.1:8001")
    print("📚 API Documentation:")
    print("   - http://localhost:8001/docs")
    print("   - http://localhost:8001/redoc")
    print("\n💡 Supported Defect Classes:")
    for i, defect_class in enumerate(detector.defect_classes):
        print(f"   {i}. {defect_class}")
    
    # Use localhost for better Windows compatibility
    uvicorn.run(app, host="127.0.0.1", port=8001)
