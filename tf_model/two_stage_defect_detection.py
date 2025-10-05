#!/usr/bin/env python3
"""
Two-Stage Transformer Defect Detection System
============================================

This script performs a two-stage detection process:
1. Stage 1: Segment out the transformer from the input image
2. Stage 2: Detect and classify defects within the segmented transformer
3. Display results with defects overlaid on the original image

Features:
- Automatic transformer segmentation
- Multi-class defect detection (6 types)
- Visual results with bounding boxes and labels
- Confidence scoring for each detection
- Save processed results

Usage:
    python two_stage_defect_detection.py --image path/to/image.jpg
    python two_stage_defect_detection.py --image path/to/image.jpg --confidence 0.5
    python two_stage_defect_detection.py --batch path/to/folder/
"""

import os
import sys
import cv2
import numpy as np
import argparse
from pathlib import Path
import json
from datetime import datetime
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from typing import List, Dict, Tuple, Optional

def setup_environment():
    """Setup environment and check dependencies."""
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
    
    try:
        from ultralytics import YOLO
        import torch
        return True
    except ImportError:
        print("❌ Required packages not installed!")
        print("   Run: conda activate yolov11")
        print("   Then: pip install ultralytics torch matplotlib")
        return False

class TwoStageDefectDetector:
    """Two-stage transformer defect detection system."""
    
    def __init__(self, 
                 transformer_model_path: str = "runs/seg_y11n_tx3/weights/best.pt",
                 defect_model_path: str = "runs/detect/transformer_defects_v1/weights/best.pt",
                 confidence_threshold: float = 0.5,
                 output_dir: str = "detection_results"):
        """
        Initialize the two-stage detector.
        
        Args:
            transformer_model_path: Path to transformer segmentation model
            defect_model_path: Path to defect detection model  
            confidence_threshold: Minimum confidence for detections
            output_dir: Directory to save results
        """
        
        self.transformer_model_path = transformer_model_path
        self.defect_model_path = defect_model_path
        self.confidence_threshold = confidence_threshold
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Define defect class names and colors
        self.defect_classes = [
            'Full Wire Overload PF',
            'Loose Joint F', 
            'Loose Joint PF',
            'Point Overload F',
            'Point Overload PF',
            'Transformer Overload'
        ]
        
        # Color map for different defect types (BGR format for OpenCV)
        self.colors = {
            0: (0, 0, 255),     # Red - Full Wire Overload PF
            1: (0, 165, 255),   # Orange - Loose Joint F
            2: (0, 255, 255),   # Yellow - Loose Joint PF
            3: (255, 0, 0),     # Blue - Point Overload F
            4: (255, 0, 255),   # Magenta - Point Overload PF
            5: (0, 255, 0),     # Green - Transformer Overload
        }
        
        self.transformer_model = None
        self.defect_model = None
        
    def load_models(self) -> bool:
        """Load both YOLO models."""
        try:
            from ultralytics import YOLO
            
            # Load transformer segmentation model
            if os.path.exists(self.transformer_model_path):
                print(f"🔄 Loading transformer segmentation model: {self.transformer_model_path}")
                self.transformer_model = YOLO(self.transformer_model_path)
                print("✅ Transformer segmentation model loaded")
            else:
                print(f"❌ Transformer model not found: {self.transformer_model_path}")
                return False
            
            # Load defect detection model
            if os.path.exists(self.defect_model_path):
                print(f"🔄 Loading defect detection model: {self.defect_model_path}")
                self.defect_model = YOLO(self.defect_model_path)
                print("✅ Defect detection model loaded")
            else:
                print(f"❌ Defect model not found: {self.defect_model_path}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Error loading models: {str(e)}")
            return False
    
    def segment_transformer(self, image: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[np.ndarray], Dict]:
        """
        Stage 1: Segment transformer from the input image.
        
        Args:
            image: Input image as numpy array
            
        Returns:
            cropped_transformer: Cropped transformer region
            transformer_mask: Binary mask of transformer
            stage1_info: Dictionary with stage 1 detection info
        """
        
        try:
            # Run transformer segmentation
            results = self.transformer_model(image, conf=self.confidence_threshold, verbose=False)
            
            if not results or len(results) == 0:
                return None, None, {"status": "no_transformer_detected"}
            
            result = results[0]
            
            # Check if any transformers were detected
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
                
                # Resize mask to match image dimensions
                if transformer_mask.shape != image.shape[:2]:
                    transformer_mask = cv2.resize(transformer_mask, (image.shape[1], image.shape[0]))
            
            # Crop transformer region with some padding
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
            print(f"❌ Error in transformer segmentation: {str(e)}")
            return None, None, {"status": "error", "message": str(e)}
    
    def detect_defects(self, transformer_image: np.ndarray) -> Tuple[List[Dict], Dict]:
        """
        Stage 2: Detect defects within the segmented transformer.
        
        Args:
            transformer_image: Cropped transformer image
            
        Returns:
            defects: List of detected defects with bounding boxes and classes
            stage2_info: Dictionary with stage 2 detection info
        """
        
        try:
            # Run defect detection on cropped transformer
            results = self.defect_model(transformer_image, conf=self.confidence_threshold, verbose=False)
            
            if not results or len(results) == 0:
                return [], {"status": "no_defects_detected", "defect_count": 0}
            
            result = results[0]
            
            # Check if any defects were detected
            if result.boxes is None or len(result.boxes) == 0:
                return [], {"status": "no_defects_detected", "defect_count": 0}
            
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
            
            # Sort defects by confidence (highest first)
            defects.sort(key=lambda x: x['confidence'], reverse=True)
            
            stage2_info = {
                "status": "defects_detected",
                "defect_count": len(defects),
                "classes_detected": list(set([d['class_name'] for d in defects]))
            }
            
            return defects, stage2_info
            
        except Exception as e:
            print(f"❌ Error in defect detection: {str(e)}")
            return [], {"status": "error", "message": str(e)}
    
    def overlay_results_on_original(self, 
                                  original_image: np.ndarray,
                                  stage1_info: Dict,
                                  defects: List[Dict],
                                  stage2_info: Dict) -> np.ndarray:
        """
        Overlay detection results on the original image.
        
        Args:
            original_image: Original input image
            stage1_info: Transformer detection info
            defects: List of detected defects
            stage2_info: Defect detection info
            
        Returns:
            annotated_image: Image with overlaid results
        """
        
        # Create a copy of the original image
        annotated = original_image.copy()
        
        # Overlay defects on original image coordinates
        if defects and stage1_info.get("status") == "transformer_detected":
            crop_x1, crop_y1, crop_x2, crop_y2 = stage1_info["crop_bbox"]
            
            for defect in defects:
                # Convert defect coordinates from cropped image to original image
                dx1, dy1, dx2, dy2 = defect["bbox"]
                
                # Map back to original image coordinates
                orig_x1 = crop_x1 + dx1
                orig_y1 = crop_y1 + dy1
                orig_x2 = crop_x1 + dx2
                orig_y2 = crop_y1 + dy2
                
                # Draw defect bounding box
                color = defect["color"]
                cv2.rectangle(annotated, (orig_x1, orig_y1), (orig_x2, orig_y2), color, 2)
                
                # Create label with class name and confidence
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
    
    def create_detailed_visualization(self, 
                                   original_image: np.ndarray,
                                   transformer_crop: Optional[np.ndarray],
                                   defects: List[Dict],
                                   stage1_info: Dict,
                                   stage2_info: Dict) -> plt.Figure:
        """Create a detailed visualization with multiple panels."""
        
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('Two-Stage Transformer Defect Detection Results', fontsize=16, fontweight='bold')
        
        # Panel 1: Original Image
        axes[0,0].imshow(cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB))
        axes[0,0].set_title('Original Image')
        axes[0,0].axis('off')
        
        # Panel 2: Transformer Detection (Stage 1)
        axes[0,1].imshow(cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB))
        axes[0,1].set_title(f'Stage 1: Transformer Detection (Conf: {stage1_info.get("confidence", 0):.2f})')
        axes[0,1].axis('off')
        
        # Panel 3: Cropped Transformer with Defects
        if transformer_crop is not None:
            crop_with_defects = transformer_crop.copy()
            for defect in defects:
                dx1, dy1, dx2, dy2 = defect["bbox"]
                color = defect["color"]
                cv2.rectangle(crop_with_defects, (dx1, dy1), (dx2, dy2), color, 2)
                cv2.putText(crop_with_defects, f"{defect['class_name'][:10]}...",
                          (dx1, dy1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            
            axes[1,0].imshow(cv2.cvtColor(crop_with_defects, cv2.COLOR_BGR2RGB))
        else:
            axes[1,0].text(0.5, 0.5, 'No Transformer Detected', 
                          ha='center', va='center', transform=axes[1,0].transAxes, fontsize=14)
        
        axes[1,0].set_title(f'Stage 2: Defect Detection ({stage2_info.get("defect_count", 0)} defects)')
        axes[1,0].axis('off')
        
        # Panel 4: Final Result
        final_result = self.overlay_results_on_original(original_image, stage1_info, defects, stage2_info)
        axes[1,1].imshow(cv2.cvtColor(final_result, cv2.COLOR_BGR2RGB))
        axes[1,1].set_title('Final Result: Original + Detections')
        axes[1,1].axis('off')
        
        # Add detection summary
        summary_text = f"""Detection Summary:
Stage 1: {stage1_info.get('status', 'unknown')}
Stage 2: {stage2_info.get('defect_count', 0)} defects found
Classes: {', '.join(stage2_info.get('classes_detected', []))}"""
        
        fig.text(0.02, 0.02, summary_text, fontsize=10, 
                bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgray"))
        
        plt.tight_layout()
        return fig
    
    def process_single_image(self, image_path: str) -> Dict:
        """
        Process a single image through the two-stage detection pipeline.
        
        Args:
            image_path: Path to input image
            
        Returns:
            results: Dictionary containing all detection results
        """
        
        print(f"\n🔍 Processing: {image_path}")
        
        # Load image
        if not os.path.exists(image_path):
            return {"status": "error", "message": f"Image not found: {image_path}"}
        
        try:
            original_image = cv2.imread(image_path)
            if original_image is None:
                return {"status": "error", "message": f"Could not load image: {image_path}"}
            
            print(f"   📐 Image size: {original_image.shape[:2]}")
            
        except Exception as e:
            return {"status": "error", "message": f"Error loading image: {str(e)}"}
        
        # Stage 1: Segment transformer
        print("   🎯 Stage 1: Segmenting transformer...")
        transformer_crop, transformer_mask, stage1_info = self.segment_transformer(original_image)
        
        if stage1_info["status"] != "transformer_detected":
            print(f"   ❌ {stage1_info['status']}")
            return {
                "status": "no_transformer", 
                "stage1_info": stage1_info,
                "image_path": image_path
            }
        
        print(f"   ✅ Transformer detected (confidence: {stage1_info['confidence']:.2f})")
        
        # Stage 2: Detect defects
        print("   🔍 Stage 2: Detecting defects...")
        defects, stage2_info = self.detect_defects(transformer_crop)
        
        print(f"   🎯 Found {stage2_info['defect_count']} defects")
        
        if defects:
            for defect in defects:
                print(f"     - {defect['class_name']} (confidence: {defect['confidence']:.2f})")
        
        # Create output filename
        input_name = Path(image_path).stem
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save annotated result
        annotated_result = self.overlay_results_on_original(original_image, stage1_info, defects, stage2_info)
        result_path = self.output_dir / f"{input_name}_annotated_{timestamp}.jpg"
        cv2.imwrite(str(result_path), annotated_result)
        
        # Save detailed visualization
        fig = self.create_detailed_visualization(original_image, transformer_crop, defects, stage1_info, stage2_info)
        viz_path = self.output_dir / f"{input_name}_detailed_{timestamp}.png"
        fig.savefig(str(viz_path), dpi=150, bbox_inches='tight')
        plt.close(fig)
        
        # Save JSON report
        report = {
            "input_image": image_path,
            "timestamp": timestamp,
            "stage1_info": stage1_info,
            "stage2_info": stage2_info,
            "defects": defects,
            "output_files": {
                "annotated_image": str(result_path),
                "detailed_visualization": str(viz_path)
            }
        }
        
        report_path = self.output_dir / f"{input_name}_report_{timestamp}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"   💾 Results saved:")
        print(f"     - Annotated: {result_path}")
        print(f"     - Detailed: {viz_path}")
        print(f"     - Report: {report_path}")
        
        return {
            "status": "success",
            "stage1_info": stage1_info,
            "stage2_info": stage2_info,
            "defects": defects,
            "output_files": {
                "annotated_image": str(result_path),
                "detailed_visualization": str(viz_path),
                "report": str(report_path)
            }
        }

def main():
    """Main function with command line interface."""
    parser = argparse.ArgumentParser(description="Two-Stage Transformer Defect Detection")
    parser.add_argument("--image", "-i", type=str, help="Path to input image")
    parser.add_argument("--batch", "-b", type=str, help="Path to folder with images")
    parser.add_argument("--confidence", "-c", type=float, default=0.5, help="Confidence threshold (0-1)")
    parser.add_argument("--transformer-model", type=str, default="runs/seg_y11n_tx3/weights/best.pt", 
                       help="Path to transformer segmentation model")
    parser.add_argument("--defect-model", type=str, default="runs/detect/transformer_defects_v1/weights/best.pt",
                       help="Path to defect detection model")
    parser.add_argument("--output", "-o", type=str, default="detection_results", help="Output directory")
    
    args = parser.parse_args()
    
    if not args.image and not args.batch:
        print("❌ Please provide either --image or --batch argument")
        parser.print_help()
        return
    
    # Setup environment
    if not setup_environment():
        return
    
    # Initialize detector
    print("🚀 Two-Stage Transformer Defect Detection System")
    print("=" * 50)
    
    detector = TwoStageDefectDetector(
        transformer_model_path=args.transformer_model,
        defect_model_path=args.defect_model,
        confidence_threshold=args.confidence,
        output_dir=args.output
    )
    
    # Load models
    if not detector.load_models():
        print("❌ Failed to load models. Please check model paths.")
        return
    
    # Process images
    if args.image:
        # Single image processing
        result = detector.process_single_image(args.image)
        
        if result["status"] == "success":
            print(f"\n🎉 Processing completed successfully!")
            print(f"   📊 {result['stage2_info']['defect_count']} defects detected")
            if result['defects']:
                print(f"   🏷️  Classes: {', '.join(result['stage2_info']['classes_detected'])}")
        else:
            print(f"\n❌ Processing failed: {result.get('message', result['status'])}")
    
    elif args.batch:
        # Batch processing
        batch_dir = Path(args.batch)
        if not batch_dir.exists():
            print(f"❌ Batch directory not found: {batch_dir}")
            return
        
        # Find all image files
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
        image_files = []
        for ext in image_extensions:
            image_files.extend(batch_dir.glob(f"*{ext}"))
            image_files.extend(batch_dir.glob(f"*{ext.upper()}"))
        
        if not image_files:
            print(f"❌ No image files found in: {batch_dir}")
            return
        
        print(f"📁 Found {len(image_files)} images to process")
        
        successful = 0
        total_defects = 0
        
        for image_file in image_files:
            result = detector.process_single_image(str(image_file))
            if result["status"] == "success":
                successful += 1
                total_defects += result['stage2_info']['defect_count']
        
        print(f"\n📊 Batch Processing Summary:")
        print(f"   ✅ Successfully processed: {successful}/{len(image_files)}")
        print(f"   🎯 Total defects found: {total_defects}")
        print(f"   📁 Results saved to: {detector.output_dir}")

if __name__ == "__main__":
    main()