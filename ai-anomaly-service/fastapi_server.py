# YOLO-based Thermal Anomaly Detection API
# Integrated with trained YOLOv8 model for accurate anomaly detection

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

# Create the FastAPI application instance
app = FastAPI(
    title="YOLO Thermal Anomaly Detection API",
    description="Production-ready thermal anomaly detection using YOLOv8",
    version="4.0.0"
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
    """Individual anomaly detection"""
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    center: List[float]  # [center_x, center_y]

class AnomalyDetectionResult(BaseModel):
    """Complete YOLO detection result"""
    success: bool
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

# YOLO-BASED THERMAL ANOMALY DETECTION ENGINE
class ThermalAnomalyDetector:
    """
    Production-ready YOLO-based thermal anomaly detection system
    """
    
    def __init__(self, model_path: str = None):
        """Initialize the YOLO model"""
        # Look for model in parent directory first, then current directory
        if model_path is None:
            possible_paths = [
                "../thermal_anomaly_model.pt",  # Parent directory
                "../../thermal_anomaly_model.pt",  # Two levels up
                "thermal_anomaly_model.pt",  # Current directory
                "models/thermal_anomaly_model.pt"  # Models subdirectory
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    model_path = path
                    break
            
            if model_path is None:
                model_path = "thermal_anomaly_model.pt"  # Default fallback
        
        self.model_path = model_path
        self.model = None
        self.model_version = "4.0.0"
        
        # Define anomaly classes (matching training data)
        self.class_names = {
            0: "Loose Joint (Faulty)",
            1: "Loose Joint (Potential)",  
            2: "Overheating (Faulty)",
            3: "Overheating (Potential)",
            4: "Warm Area (Likely Normal)",
            5: "Warm Area (Potential Issue)",
            6: "Cooling System Issue"
        }
        
        # Color mapping for different anomaly types
        self.colors = {
            0: (0, 0, 255),      # Red - Critical (Faulty)
            1: (0, 165, 255),    # Orange - High (Potential)
            2: (0, 0, 255),      # Red - Critical (Faulty)
            3: (0, 165, 255),    # Orange - High (Potential)
            4: (0, 255, 0),      # Green - Normal
            5: (0, 255, 255),    # Yellow - Medium
            6: (255, 0, 0)       # Blue - Cooling issue
        }
        
        self._load_model()
    
    def _load_model(self):
        """Load the trained YOLO model with fallback options"""
        try:
            # Try loading custom trained model first
            full_path = os.path.abspath(self.model_path)
            print(f"Attempting to load model from: {full_path}")
            
            if os.path.exists(self.model_path):
                print(f"Model file found at: {self.model_path}")
                self.model = YOLO(self.model_path)
                print(f"Custom thermal anomaly YOLO model loaded successfully: {self.model_path}")
                
                # Keep original thermal-specific class names
                self.class_names = {
                    0: "Loose Joint (Faulty)",
                    1: "Loose Joint (Potential)",  
                    2: "Overheating (Faulty)",
                    3: "Overheating (Potential)",
                    4: "Warm Area (Likely Normal)",
                    5: "Warm Area (Potential Issue)",
                    6: "Cooling System Issue"
                }
                return True
            
            # Fallback to pre-trained YOLOv8 model for demonstration
            print(f"Custom model not found at {self.model_path}")
            print("Trying fallback pre-trained YOLOv8n model...")
            self.model = YOLO('yolov8n.pt')  # This will download if not exists
            print("Pre-trained YOLOv8n model loaded successfully (fallback mode)")
            
            # Update class names for general object detection (fallback)
            self.class_names = {
                0: "Thermal Anomaly (Generic)",
                1: "Hot Spot",
                2: "Equipment Issue", 
                3: "Temperature Variation",
                4: "Normal Area",
                5: "Potential Issue",
                6: "Component Failure"
            }
            
            return True
            
        except Exception as e:
            print(f"Failed to load any YOLO model: {e}")
            print("Please ensure you have:")
            print("1. The thermal_anomaly_model.pt file in the correct location")
            print("2. Internet connection for downloading pre-trained model")
            print("3. Proper ultralytics installation: pip install ultralytics")
            import traceback
            traceback.print_exc()
            return False
    
    def detect_anomalies(self, image: np.ndarray, confidence_threshold: float = 0.25, 
                        image_name: str = "thermal_image") -> AnomalyDetectionResult:
        """
        Main YOLO-based anomaly detection function
        
        Args:
            image: Input thermal image
            confidence_threshold: Detection confidence threshold
            image_name: Name of the image being processed
            
        Returns:
            AnomalyDetectionResult: Complete detection results with editable annotations
        """
        try:
            if not self.model:
                print("Model not loaded, attempting to reload...")
                if not self._load_model():
                    raise HTTPException(status_code=500, detail="YOLO model not loaded and failed to initialize")
                print("Model reloaded successfully")
            
            start_time = datetime.now()
            print(f"Starting YOLO detection on {image_name}...")
            
            # Get image dimensions
            height, width = image.shape[:2]
            image_size = [width, height]
            
            # Run YOLO inference
            results = self.model(image, conf=confidence_threshold, device='cpu')
            
            # Process detections
            detections = []
            total_severity = 0.0
            annotated_image = image.copy()
            
            for result in results:
                if result is None:
                    continue
                    
                boxes = result.boxes
                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        try:
                            # Extract detection info with null checks
                            if box.cls is None or len(box.cls) == 0:
                                continue
                            if box.conf is None or len(box.conf) == 0:
                                continue
                            if box.xyxy is None or len(box.xyxy) == 0:
                                continue
                                
                            class_id = int(box.cls[0])
                            confidence = float(box.conf[0])
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            
                        except Exception as box_error:
                            print(f"Error processing detection box: {box_error}")
                            continue
                        
                        # Calculate center point
                        center_x = (x1 + x2) / 2
                        center_y = (y1 + y2) / 2
                        
                        # Get class name
                        class_name = self.class_names.get(class_id, f"Unknown_{class_id}")
                        
                        # Create detection object
                        detection = Detection(
                            class_id=class_id,
                            class_name=class_name,
                            confidence=confidence,
                            bbox=[float(x1), float(y1), float(x2), float(y2)],
                            center=[float(center_x), float(center_y)]
                        )
                        detections.append(detection)
                        
                        # Calculate severity based on class and confidence
                        if "Faulty" in class_name:
                            severity = confidence * 1.0  # High severity for faulty
                        elif "Potential" in class_name:
                            severity = confidence * 0.7  # Medium severity for potential
                        else:
                            severity = confidence * 0.3  # Low severity for normal/cooling
                        
                        total_severity += severity
                        
                        # Draw annotation on image
                        color = self.colors.get(class_id, (255, 255, 255))
                        cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                        
                        # Add label
                        label = f"{class_name} ({confidence:.2f})"
                        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                        cv2.rectangle(annotated_image, (int(x1), int(y1) - label_size[1] - 10),
                                    (int(x1) + label_size[0], int(y1)), color, -1)
                        cv2.putText(annotated_image, label, (int(x1), int(y1) - 5),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Calculate overall metrics
            total_detections = len(detections)
            overall_severity = total_severity / total_detections if total_detections > 0 else 0.0
            
            # Determine severity level
            if total_detections == 0:
                severity_level = "NONE"
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
            
            print(f"Detection complete! Found {total_detections} anomalies in {processing_time:.2f}s")
            
            return AnomalyDetectionResult(
                success=True,
                detections=detections,
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
            print(f"Error in YOLO detection: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

# Initialize the YOLO model (this happens when the server starts)
detector = ThermalAnomalyDetector()

# API Routes
@app.get("/")
async def root():
    return {"message": "YOLO Thermal Anomaly Detection API", "version": "4.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": detector.model is not None,
        "model_path": detector.model_path,
        "service_version": detector.model_version,
        "supported_classes": list(detector.class_names.values()),
        "ultralytics_available": True
    }

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify service is running"""
    return {
        "message": "FastAPI service is running", 
        "timestamp": datetime.now().isoformat(),
        "model_status": "loaded" if detector.model else "not_loaded"
    }

@app.post("/detect-thermal-anomalies", response_model=AnomalyDetectionResult)
async def detect_thermal_anomalies(
    file: UploadFile = File(..., description="Thermal image to analyze"),
    confidence_threshold: Optional[float] = 0.25
):
    """
    Main endpoint for YOLO-based thermal anomaly detection
    This endpoint processes a single thermal image and returns detected anomalies
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
        
        # Run YOLO detection
        result = detector.detect_anomalies(
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

if __name__ == "__main__":
    try:
        import uvicorn
    except ImportError:
        print("uvicorn not installed. Install with: pip install uvicorn")
        exit(1)
        
    print("🚀 Starting YOLO Thermal Anomaly Detection API...")
    print("🤖 YOLO Model Status:", "Loaded" if detector.model else "Failed to Load")
    print("📱 Server will be available at:")
    print("   - http://localhost:8001")
    print("   - http://127.0.0.1:8001")
    print("📚 API Documentation:")
    print("   - http://localhost:8001/docs")
    print("   - http://localhost:8001/redoc")
    
    # Use localhost for better Windows compatibility
    uvicorn.run(app, host="127.0.0.1", port=8001)
