#!/usr/bin/env python3
"""
Thermal Anomaly Detection - Model Testing Suite
==============================================
Comprehensive testing module for the trained YOLO model

Features:
- Single image testing
- Batch image processing  
- Interactive testing interface
- Detailed reporting and visualization
- Multiple output formats

Version: 1.0
"""

# Fix OpenMP conflict
import os
os.environ['KMP_DUPLICATE_LIB_[OK]'] = 'TRUE'

import sys
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import argparse
from typing import List, Dict, Optional
import json
from datetime import datetime

class ThermalAnomalyTester:
    """Main testing class for thermal anomaly detection"""
    
    def __init__(self, model_path: str):
        """Initialize tester with model path"""
        
        self.model_path = model_path
        self.model = None
        
        # Class definitions
        self.class_names = {
            0: "Loose Joint (Faulty)",
            1: "Loose Joint (Potential)", 
            2: "Point Overload (Faulty)",
            3: "Point Overload (Potential)",
            4: "Full Wire Overload (Potential)",
            5: "Hotspot (Review)",
            6: "Warm Area (Likely Normal)"
        }
        
        # Color mapping for visualization
        self.colors = {
            0: (255, 0, 0),    # Red - Critical
            1: (255, 165, 0),  # Orange - Potential
            2: (255, 0, 0),    # Red - Critical
            3: (255, 165, 0),  # Orange - Potential
            4: (255, 140, 0),  # Dark Orange
            5: (255, 255, 0),  # Yellow
            6: (0, 255, 0)     # Green
        }
        
        self.severity_weights = {
            0: 1.0, 1: 0.7, 2: 1.0, 3: 0.8, 4: 0.9, 5: 0.6, 6: 0.2
        }
        
        self._load_model()
    
    def _load_model(self) -> bool:
        """Load the YOLO model"""
        
        if not os.path.exists(self.model_path):
            print(f"[[ERROR]] Model not found: {self.model_path}")
            return False
        
        try:
            self.model = YOLO(self.model_path)
            print(f"Model loaded: {Path(self.model_path).name}")
            return True
        except Exception as e:
            print(f"Failed to load model: {e}")
            return False
    
    def test_single_image(self, image_path: str, confidence: float = 0.25, 
                         save_results: bool = True) -> Dict:
        """Test model on a single image"""
        
        if not os.path.exists(image_path):
            print(f"Image not found: {image_path}")
            return {}
        
        image_name = Path(image_path).name
        print(f"Testing: {image_name}")
        
        try:
            # Run inference
            results = self.model(image_path, conf=confidence, device='cpu')
            
            # Process detections
            detections = []
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                
                for i in range(len(boxes)):
                    box = boxes.xyxy[i].cpu().numpy()
                    conf = float(boxes.conf[i].cpu().numpy())
                    class_id = int(boxes.cls[i].cpu().numpy())
                    
                    detection = {
                        'bbox': box.tolist(),
                        'confidence': conf,
                        'class_id': class_id,
                        'class_name': self.class_names.get(class_id, f"Class {class_id}"),
                        'severity': self.severity_weights.get(class_id, 0.5)
                    }
                    detections.append(detection)
            
            # Create result object
            result = {
                'image_path': image_path,
                'image_name': Path(image_path).name,
                'detections': detections,
                'total_detections': len(detections),
                'timestamp': datetime.now().isoformat(),
                'confidence_threshold': confidence
            }
            
            # Calculate severity score
            result['severity_score'] = sum(d['confidence'] * d['severity'] for d in detections)
            result['severity_level'] = self._get_severity_level(result['severity_score'])
            
            # Save results if requested
            if save_results:
                self._save_test_results(result, results[0] if len(results) > 0 else None)
            
            # Print summary
            self._print_test_summary(result)
            
            return result
            
        except Exception as e:
            print(f"Test failed: {e}")
            return {}
    
    def test_batch_images(self, folder_path: str, confidence: float = 0.25) -> List[Dict]:
        """Test model on multiple images in a folder"""
        
        folder = Path(folder_path)
        if not folder.exists():
            print(f"[[ERROR]] Folder not found: {folder_path}")
            return []
        
        # Find image files
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
        image_files = []
        for ext in image_extensions:
            image_files.extend(folder.glob(f"*{ext}"))
            image_files.extend(folder.glob(f"*{ext.upper()}"))
        
        if not image_files:
            print(f"[[ERROR]] No images found in: {folder_path}")
            return []
        
        print(f" Processing {len(image_files)} images...")
        
        # Process each image
        results = []
        for i, img_path in enumerate(image_files, 1):
            print(f"\n[{i}/{len(image_files)}] Processing: {img_path.name}")
            result = self.test_single_image(str(img_path), confidence, save_results=False)
            if result:
                results.append(result)
        
        # Create batch summary
        self._create_batch_summary(results)
        
        return results
    
    def _save_test_results(self, result: Dict, yolo_result=None):
        """Save test results to files including annotated images"""
        
        output_dir = Path("test_results")
        output_dir.mkdir(exist_ok=True)
        
        image_name = Path(result['image_path']).stem
        
        # Save YOLO annotated image (automatic annotations)
        if yolo_result:
            yolo_annotated_path = output_dir / f"{image_name}_yolo_annotated.jpg"
            yolo_result.save(filename=str(yolo_annotated_path))
            result['yolo_annotated_image_path'] = str(yolo_annotated_path)
        
        # Create custom annotated image with detailed labels
        custom_annotated_path = output_dir / f"{image_name}_detailed_annotated.jpg"
        self._create_detailed_annotated_image(result, custom_annotated_path)
        result['detailed_annotated_image_path'] = str(custom_annotated_path)
        
        # Save JSON report
        json_path = output_dir / f"{image_name}_report.json"
        with open(json_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        # Save text report
        text_path = output_dir / f"{image_name}_report.txt"
        with open(text_path, 'w') as f:
            f.write(self._generate_text_report(result))
        
        print(f"[SAVE] Results saved:")
        print(f"   [STATS] Report: {json_path.name}")
        print(f"   [IMAGE]  YOLO Annotated: {yolo_annotated_path.name}")
        print(f"    Detailed Annotated: {custom_annotated_path.name}")
    
    def _generate_text_report(self, result: Dict) -> str:
        """Generate detailed text report"""
        
        lines = []
        lines.append("THERMAL ANOMALY DETECTION REPORT")
        lines.append("=" * 50)
        lines.append(f"[IMAGE] Image: {result['image_name']}")
        lines.append(f" Timestamp: {result['timestamp']}")
        lines.append(f"[TARGET] Total Detections: {result['total_detections']}")
        lines.append(f"[STATS] Severity Score: {result['severity_score']:.2f}")
        lines.append(f"[[WARNING]]  Severity Level: {result['severity_level']}")
        lines.append("")
        
        if not result['detections']:
            lines.append("[[OK]] No anomalies detected - System appears normal")
            return "\n".join(lines)
        
        # Group by severity
        critical = [d for d in result['detections'] if d['class_id'] in [0, 2]]
        potential = [d for d in result['detections'] if d['class_id'] in [1, 3, 4]]
        review = [d for d in result['detections'] if d['class_id'] == 5]
        normal = [d for d in result['detections'] if d['class_id'] == 6]
        
        if critical:
            lines.append("[ALERT] CRITICAL ISSUES:")
            for i, det in enumerate(critical, 1):
                lines.append(f"   {i}. {det['class_name']} - {det['confidence']:.2f}")
            lines.append("")
        
        if potential:
            lines.append("[[WARNING]]  POTENTIAL ISSUES:")
            for i, det in enumerate(potential, 1):
                lines.append(f"   {i}. {det['class_name']} - {det['confidence']:.2f}")
            lines.append("")
        
        if review:
            lines.append("REVIEW REQUIRED:")
            for i, det in enumerate(review, 1):
                lines.append(f"   {i}. {det['class_name']} - {det['confidence']:.2f}")
            lines.append("")
        
        if normal:
            lines.append("[[OK]] NORMAL AREAS:")
            for i, det in enumerate(normal, 1):
                lines.append(f"   {i}. {det['class_name']} - {det['confidence']:.2f}")
        
        return "\n".join(lines)
    
    def _create_detailed_annotated_image(self, result: Dict, output_path: Path):
        """Create custom annotated image with detailed labels and color coding"""
        
        try:
            # Load original image
            image = cv2.imread(result['image_path'])
            if image is None:
                print(f"Warning: Could not load image for annotation: {result['image_path']}")
                return
            
            # Convert BGR to RGB for proper colors
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width = image_rgb.shape[:2]
            
            # Create figure for plotting
            fig, ax = plt.subplots(1, 1, figsize=(12, 8))
            ax.imshow(image_rgb)
            
            # Add title with overall information
            title = f"Thermal Anomaly Detection Results\n"
            title += f"Image: {result['image_name']} | "
            title += f"Detections: {result['total_detections']} | "
            title += f"Severity: {result['severity_level']}"
            ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
            
            # Draw bounding boxes and labels for each detection
            for i, detection in enumerate(result['detections']):
                bbox = detection['bbox']
                class_id = detection['class_id']
                class_name = detection['class_name']
                confidence = detection['confidence']
                
                # Get coordinates
                x1, y1, x2, y2 = bbox
                box_width = x2 - x1
                box_height = y2 - y1
                
                # Get color for this class
                color = np.array(self.colors.get(class_id, (255, 255, 255))) / 255.0
                
                # Draw bounding box
                rect = patches.Rectangle((x1, y1), box_width, box_height,
                                       linewidth=3, edgecolor=color, facecolor='none')
                ax.add_patch(rect)
                
                # Create detailed label
                label_lines = [
                    f"#{i+1}: {class_name}",
                    f"Confidence: {confidence:.3f}",
                    f"Location: ({int(x1)}, {int(y1)})"
                ]
                label_text = '\n'.join(label_lines)
                
                # Position label above the box, or below if near top
                label_y = y1 - 10 if y1 > 60 else y2 + 5
                
                # Add label with background
                ax.text(x1, label_y, label_text, fontsize=9, fontweight='bold',
                       bbox=dict(boxstyle="round,pad=0.5", facecolor=color, alpha=0.8),
                       color='white' if class_id in [0, 2] else 'black',
                       verticalalignment='top')
            
            # Add legend for anomaly types
            legend_elements = []
            for class_id, class_name in self.class_names.items():
                color = np.array(self.colors.get(class_id, (255, 255, 255))) / 255.0
                legend_elements.append(patches.Patch(color=color, label=f"{class_id}: {class_name}"))
            
            ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1.15, 1))
            
            # Remove axes
            ax.set_xticks([])
            ax.set_yticks([])
            
            # Add detection summary text
            summary_text = f"Summary:\n"
            summary_text += f"Total Detections: {result['total_detections']}\n"
            summary_text += f"Severity Score: {result['severity_score']:.2f}\n"
            summary_text += f"Confidence Threshold: {result['confidence_threshold']}"
            
            ax.text(0.02, 0.98, summary_text, transform=ax.transAxes,
                   fontsize=10, verticalalignment='top',
                   bbox=dict(boxstyle="round,pad=0.5", facecolor='white', alpha=0.8))
            
            # Save the annotated image
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            
        except Exception as e:
            print(f"Warning: Failed to create detailed annotation: {e}")
    
    def _print_test_summary(self, result: Dict):
        """Print test summary to console"""
        
        print(f"Found {result['total_detections']} anomalies")
        print(f"Severity: {result['severity_level']}")
        
        if result['detections']:
            print("Detections:")
            for det in result['detections']:
                print(f"   - {det['class_name']} ({det['confidence']:.2f})")
    
    def _get_severity_level(self, score: float) -> str:
        """Convert severity score to level"""
        
        if score >= 2.0:
            return " CRITICAL"
        elif score >= 1.5:
            return " HIGH"
        elif score >= 1.0:
            return " MEDIUM"
        elif score >= 0.5:
            return " LOW"
        else:
            return "[[OK]] [MINIMAL]"
    
    def _create_batch_summary(self, results: List[Dict]):
        """Create batch processing summary"""
        
        if not results:
            return
        
        output_dir = Path("test_results")
        output_dir.mkdir(exist_ok=True)
        
        # Calculate statistics
        total_images = len(results)
        total_detections = sum(r['total_detections'] for r in results)
        images_with_anomalies = sum(1 for r in results if r['total_detections'] > 0)
        avg_detections = total_detections / total_images if total_images > 0 else 0
        
        # Create summary
        summary = {
            'batch_summary': {
                'timestamp': datetime.now().isoformat(),
                'total_images': total_images,
                'total_detections': total_detections,
                'images_with_anomalies': images_with_anomalies,
                'average_detections_per_image': avg_detections
            },
            'results': results
        }
        
        # Save JSON summary
        summary_path = output_dir / "batch_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"\n[STATS] BATCH SUMMARY:")
        print(f"    Images processed: {total_images}")
        print(f"   [TARGET] Total detections: {total_detections}")
        print(f"    Images with anomalies: {images_with_anomalies}")
        print(f"   [STATS] Average per image: {avg_detections:.1f}")
        print(f"   [SAVE] Results saved to: {output_dir}/")

def main():
    """Main function with CLI interface"""
    
    parser = argparse.ArgumentParser(description="Thermal Anomaly Detection Testing Suite")
    parser.add_argument("--model", "-m", type=str, 
                       default="thermal_anomaly_model.pt",
                       help="Path to trained model")
    parser.add_argument("--image", "-i", type=str, help="Single image path")
    parser.add_argument("--folder", "-f", type=str, help="Folder with images")
    parser.add_argument("--confidence", "-c", type=float, default=0.25, 
                       help="Confidence threshold")
    parser.add_argument("--interactive", "-int", action="store_true", 
                       help="Interactive mode")
    
    args = parser.parse_args()
    
    print("Thermal Anomaly Detection - Testing Suite")
    print("=" * 60)
    
    # Initialize tester
    tester = ThermalAnomalyTester(args.model)
    
    if not tester.model:
        return
    
    if args.image:
        # Single image test
        tester.test_single_image(args.image, args.confidence)
    
    elif args.folder:
        # Batch test
        tester.test_batch_images(args.folder, args.confidence)
    
    elif args.interactive:
        # Interactive mode
        interactive_menu(tester)
    
    else:
        # Default interactive mode
        interactive_menu(tester)

def interactive_menu(tester: ThermalAnomalyTester):
    """Interactive testing menu"""
    
    while True:
        print("\n[LIST] Testing Options:")
        print("1. Test single image")
        print("2. Test batch of images")
        print("3. Test dataset samples")
        print("4. Exit")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == "1":
            image_path = input("Enter image path: ").strip().strip('"')
            if image_path and os.path.exists(image_path):
                tester.test_single_image(image_path)
            else:
                print("[[ERROR]] Invalid image path")
        
        elif choice == "2":
            folder_path = input("Enter folder path: ").strip().strip('"')
            if folder_path and os.path.exists(folder_path):
                tester.test_batch_images(folder_path)
            else:
                print("[[ERROR]] Invalid folder path")
        
        elif choice == "3":
            # Use relative path from current script directory
            script_dir = Path(__file__).parent
            test_folder = script_dir / "yolo_dataset" / "images" / "test"
            if test_folder.exists():
                tester.test_batch_images(str(test_folder))
            else:
                print("[[ERROR]] Test dataset not found")
        
        elif choice == "4":
            break
        
        else:
            print("[[ERROR]] Invalid choice")

if __name__ == "__main__":
    main()