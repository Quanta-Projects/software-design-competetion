#!/usr/bin/env python3
"""
Simple GUI for Two-Stage Transformer Defect Detection
====================================================

This script provides a simple graphical interface for the defect detection system.
"""

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import os
import threading
from pathlib import Path

class DefectDetectionGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Transformer Defect Detection System")
        self.root.geometry("600x400")
        
        # Set environment
        os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
        
        self.detector = None
        self.setup_ui()
        
    def setup_ui(self):
        """Setup the user interface."""
        
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title_label = ttk.Label(main_frame, text="🔍 Transformer Defect Detection", 
                               font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Image selection
        ttk.Label(main_frame, text="Select Image:").grid(row=1, column=0, sticky=tk.W, pady=5)
        
        self.image_path_var = tk.StringVar()
        self.image_entry = ttk.Entry(main_frame, textvariable=self.image_path_var, width=50)
        self.image_entry.grid(row=1, column=1, padx=(10, 5), pady=5)
        
        self.browse_btn = ttk.Button(main_frame, text="Browse", command=self.browse_image)
        self.browse_btn.grid(row=1, column=2, padx=(5, 0), pady=5)
        
        # Confidence setting
        ttk.Label(main_frame, text="Confidence Threshold:").grid(row=2, column=0, sticky=tk.W, pady=5)
        
        self.confidence_var = tk.DoubleVar(value=0.5)
        confidence_scale = ttk.Scale(main_frame, from_=0.1, to=1.0, variable=self.confidence_var, 
                                   orient=tk.HORIZONTAL, length=200)
        confidence_scale.grid(row=2, column=1, sticky=(tk.W, tk.E), padx=(10, 5), pady=5)
        
        self.confidence_label = ttk.Label(main_frame, text="0.5")
        self.confidence_label.grid(row=2, column=2, padx=(5, 0), pady=5)
        
        # Update confidence label
        confidence_scale.configure(command=self.update_confidence_label)
        
        # Process button
        self.process_btn = ttk.Button(main_frame, text="🚀 Detect Defects", 
                                     command=self.process_image, style="Accent.TButton")
        self.process_btn.grid(row=3, column=0, columnspan=3, pady=20)
        
        # Progress bar
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate', length=400)
        self.progress.grid(row=4, column=0, columnspan=3, pady=10)
        
        # Status text
        self.status_text = tk.Text(main_frame, height=12, width=70)
        self.status_text.grid(row=5, column=0, columnspan=3, pady=(10, 0))
        
        # Scrollbar for status text
        scrollbar = ttk.Scrollbar(main_frame, orient=tk.VERTICAL, command=self.status_text.yview)
        scrollbar.grid(row=5, column=3, sticky=(tk.N, tk.S))
        self.status_text.configure(yscrollcommand=scrollbar.set)
        
        # Results buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=6, column=0, columnspan=3, pady=(10, 0))
        
        self.open_results_btn = ttk.Button(button_frame, text="📁 Open Results Folder", 
                                          command=self.open_results_folder, state=tk.DISABLED)
        self.open_results_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.clear_btn = ttk.Button(button_frame, text="🗑️ Clear Output", 
                                   command=self.clear_output)
        self.clear_btn.pack(side=tk.LEFT)
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(5, weight=1)
        
    def browse_image(self):
        """Browse for an image file."""
        filetypes = [
            ("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff"),
            ("JPEG files", "*.jpg *.jpeg"),
            ("PNG files", "*.png"),
            ("All files", "*.*")
        ]
        
        filename = filedialog.askopenfilename(
            title="Select Thermal Image",
            filetypes=filetypes,
            initialdir="Sample Thermal Images" if os.path.exists("Sample Thermal Images") else "."
        )
        
        if filename:
            self.image_path_var.set(filename)
    
    def update_confidence_label(self, value):
        """Update the confidence label."""
        self.confidence_label.config(text=f"{float(value):.2f}")
    
    def log_message(self, message):
        """Add a message to the status text."""
        self.status_text.insert(tk.END, message + "\n")
        self.status_text.see(tk.END)
        self.root.update()
    
    def clear_output(self):
        """Clear the output text."""
        self.status_text.delete(1.0, tk.END)
    
    def open_results_folder(self):
        """Open the results folder in file explorer."""
        results_dir = "detection_results"
        if os.path.exists(results_dir):
            os.startfile(results_dir)
        else:
            messagebox.showwarning("Warning", "Results folder not found!")
    
    def load_models(self):
        """Load the detection models."""
        try:
            from two_stage_defect_detection import TwoStageDefectDetector
            
            self.log_message("🔄 Loading detection models...")
            
            self.detector = TwoStageDefectDetector(
                confidence_threshold=self.confidence_var.get(),
                output_dir="detection_results"
            )
            
            if self.detector.load_models():
                self.log_message("✅ Models loaded successfully!")
                return True
            else:
                self.log_message("❌ Failed to load models!")
                return False
                
        except ImportError as e:
            self.log_message(f"❌ Import error: {e}")
            self.log_message("Make sure you're running this in the yolov11 conda environment")
            return False
        except Exception as e:
            self.log_message(f"❌ Error loading models: {e}")
            return False
    
    def process_image_thread(self):
        """Process the image in a separate thread."""
        try:
            image_path = self.image_path_var.get().strip()
            
            if not image_path:
                self.log_message("❌ Please select an image first!")
                return
            
            if not os.path.exists(image_path):
                self.log_message(f"❌ Image file not found: {image_path}")
                return
            
            # Load models if not already loaded
            if self.detector is None:
                if not self.load_models():
                    return
            
            # Update detector confidence
            self.detector.confidence_threshold = self.confidence_var.get()
            
            self.log_message(f"🔍 Processing: {os.path.basename(image_path)}")
            self.log_message(f"   Confidence threshold: {self.confidence_var.get():.2f}")
            
            # Process the image
            result = self.detector.process_single_image(image_path)
            
            if result["status"] == "success":
                stage1 = result['stage1_info']
                stage2 = result['stage2_info']
                defects = result['defects']
                
                self.log_message("✅ Processing completed successfully!")
                self.log_message(f"   🎯 Stage 1: {stage1['status']}")
                
                if stage1['status'] == 'transformer_detected':
                    self.log_message(f"      Transformer confidence: {stage1['confidence']:.3f}")
                
                self.log_message(f"   🔍 Stage 2: {stage2['defect_count']} defects found")
                
                if defects:
                    self.log_message("   📋 Detected defects:")
                    for defect in defects:
                        self.log_message(f"      - {defect['class_name']}: {defect['confidence']:.3f}")
                else:
                    self.log_message("   ✅ No defects detected - transformer appears normal")
                
                self.log_message(f"   💾 Results saved to: detection_results/")
                
                # Enable results button
                self.open_results_btn.config(state=tk.NORMAL)
                
            else:
                self.log_message(f"❌ Processing failed: {result.get('message', result['status'])}")
                
        except Exception as e:
            self.log_message(f"❌ Error during processing: {e}")
            import traceback
            self.log_message(traceback.format_exc())
        
        finally:
            # Stop progress bar and re-enable button
            self.progress.stop()
            self.process_btn.config(state=tk.NORMAL, text="🚀 Detect Defects")
    
    def process_image(self):
        """Start image processing."""
        if not self.image_path_var.get().strip():
            messagebox.showwarning("Warning", "Please select an image first!")
            return
        
        # Disable button and start progress
        self.process_btn.config(state=tk.DISABLED, text="Processing...")
        self.progress.start()
        
        # Start processing in separate thread
        thread = threading.Thread(target=self.process_image_thread)
        thread.daemon = True
        thread.start()
    
    def run(self):
        """Run the GUI application."""
        self.log_message("🚀 Transformer Defect Detection System Ready")
        self.log_message("📝 Instructions:")
        self.log_message("   1. Click 'Browse' to select a thermal image")
        self.log_message("   2. Adjust confidence threshold if needed")
        self.log_message("   3. Click 'Detect Defects' to start analysis")
        self.log_message("   4. Results will be saved to 'detection_results' folder")
        self.log_message("")
        self.log_message("💡 Tip: Use confidence 0.3-0.7 for best results")
        self.log_message("")
        
        self.root.mainloop()

def main():
    """Main function."""
    
    # Check if we're in the right directory
    if not os.path.exists('two_stage_defect_detection.py'):
        messagebox.showerror("Error", 
                           "Please run this script from the tf_model directory\n"
                           "Make sure 'two_stage_defect_detection.py' exists in the current folder")
        return
    
    # Check for sample images
    if not os.path.exists('Sample Thermal Images') and not os.path.exists('Transformer Defects'):
        messagebox.showwarning("Warning",
                             "No sample images found.\n"
                             "You'll need to browse for your own thermal images.")
    
    # Start the GUI
    app = DefectDetectionGUI()
    app.run()

if __name__ == "__main__":
    main()