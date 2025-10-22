# Two-Stage Transformer Defect Detection API
# Integrated with two-stage YOLO model: Stage 1 (Transformer Segmentation) + Stage 2 (Defect Detection)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
                image_size=image_size
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
    3. Downloads images to tf_models/new_dataset/images/
    4. Fetches annotations and converts them to YOLO format
    5. Saves labels to tf_models/new_dataset/labels/
    
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
                        
                        # Fetch all user modifications and filter by imageId
                        annotations_response = await client.get(
                            f"{backend_url}/api/annotations/user-modifications"
                        )
                        
                        # Note: The endpoint might return 404 or empty list if no annotations
                        if annotations_response.status_code == 404:
                            annotations = []
                            print(f"   ℹ️  No user modifications found (404)")
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
                                
                                # Create YOLO format line with comment for error type
                                yolo_line = f"{class_identifier} {x_center} {y_center} {w_norm} {h_norm}"
                                if class_name:
                                    yolo_line += f" # errorType={class_name}"
                                
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

if __name__ == "__main__":
    try:
        import uvicorn
    except ImportError:
        print("uvicorn not installed. Install with: pip install uvicorn")
        exit(1)
        
    print("🚀 Starting Two-Stage Transformer Defect Detection API...")
    print("🤖 Model Status:")
    print(f"   Stage 1 (Transformer Segmentation): {'✅ Loaded' if detector.transformer_model else '❌ Not Loaded'}")
    print(f"   Stage 2 (Defect Detection): {'✅ Loaded' if detector.defect_model else '❌ Not Loaded'}")
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
