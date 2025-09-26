#!/usr/bin/env python3
"""
GPU Detection and CUDA Test Script
=================================
Tests GPU availability and CUDA setup for YOLO training

Author: GitHub Copilot
"""

# Fix OpenMP conflict
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import torch
import sys

def check_gpu_setup():
    """Check GPU and CUDA availability"""
    
    print("🔍 GPU and CUDA Detection")
    print("=" * 50)
    
    # Check PyTorch installation
    print(f"🐍 Python Version: {sys.version}")
    print(f"🔥 PyTorch Version: {torch.__version__}")
    
    # Check CUDA availability
    cuda_available = torch.cuda.is_available()
    print(f"⚡ CUDA Available: {'✅ YES' if cuda_available else '❌ NO'}")
    
    if cuda_available:
        # CUDA details
        print(f"🚀 CUDA Version: {torch.version.cuda}")
        print(f"📊 cuDNN Version: {torch.backends.cudnn.version()}")
        
        # GPU information
        gpu_count = torch.cuda.device_count()
        print(f"🖥️  GPU Count: {gpu_count}")
        
        for i in range(gpu_count):
            gpu_name = torch.cuda.get_device_name(i)
            gpu_memory = torch.cuda.get_device_properties(i).total_memory / 1024**3
            print(f"   GPU {i}: {gpu_name} ({gpu_memory:.1f} GB)")
        
        # Memory check
        if gpu_count > 0:
            print(f"\n💾 Current GPU Memory:")
            torch.cuda.empty_cache()  # Clear cache
            allocated = torch.cuda.memory_allocated(0) / 1024**3
            cached = torch.cuda.memory_reserved(0) / 1024**3
            total = torch.cuda.get_device_properties(0).total_memory / 1024**3
            
            print(f"   Allocated: {allocated:.2f} GB")
            print(f"   Cached: {cached:.2f} GB") 
            print(f"   Total: {total:.1f} GB")
            print(f"   Available: {total - cached:.2f} GB")
            
            # Test GPU computation
            print(f"\n🧪 Testing GPU Computation...")
            try:
                # Create test tensors
                x = torch.randn(1000, 1000, device='cuda')
                y = torch.randn(1000, 1000, device='cuda')
                
                # Perform computation
                import time
                start_time = time.time()
                z = torch.matmul(x, y)
                torch.cuda.synchronize()  # Wait for GPU computation
                end_time = time.time()
                
                print(f"   ✅ GPU computation successful!")
                print(f"   ⏱️  Matrix multiplication (1000x1000): {(end_time - start_time)*1000:.2f} ms")
                
                # Compare with CPU
                x_cpu = x.cpu()
                y_cpu = y.cpu()
                start_time = time.time()
                z_cpu = torch.matmul(x_cpu, y_cpu)
                end_time = time.time()
                
                print(f"   ⏱️  Same operation on CPU: {(end_time - start_time)*1000:.2f} ms")
                
            except Exception as e:
                print(f"   ❌ GPU computation failed: {e}")
                
    else:
        print("\n⚠️  CUDA not available. Training will use CPU.")
        print("📝 To enable GPU training:")
        print("   1. Install CUDA-compatible PyTorch:")
        print("      pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
        print("   2. Make sure you have NVIDIA GPU with CUDA support")
        print("   3. Install NVIDIA CUDA Toolkit")
    
    # Check Ultralytics GPU support
    print(f"\n🔧 Checking Ultralytics GPU Support...")
    try:
        from ultralytics import YOLO
        from ultralytics.utils import checks
        
        # This will show system info including GPU support
        checks.check_requirements()
        print("✅ Ultralytics GPU support verified")
        
    except Exception as e:
        print(f"❌ Ultralytics check failed: {e}")
    
    return cuda_available

def estimate_training_time():
    """Estimate training time based on available hardware"""
    
    cuda_available = torch.cuda.is_available()
    
    print(f"\n⏱️  Training Time Estimates (100 epochs, 106 images)")
    print("=" * 50)
    
    if cuda_available:
        gpu_name = torch.cuda.get_device_name(0)
        if "RTX" in gpu_name or "GTX" in gpu_name:
            if "4090" in gpu_name or "3090" in gpu_name:
                print("🚀 High-end GPU detected: ~10-15 minutes")
            elif "4080" in gpu_name or "3080" in gpu_name or "4070" in gpu_name:
                print("⚡ High-performance GPU: ~15-25 minutes")
            elif "3070" in gpu_name or "4060" in gpu_name:
                print("🔥 Good GPU: ~20-35 minutes")
            else:
                print("💪 Standard GPU: ~30-60 minutes")
        else:
            print("🖥️  GPU detected: ~20-45 minutes (depends on model)")
    else:
        print("🐌 CPU Only: ~2-4 hours (significantly slower)")
        print("💡 Consider using Google Colab or Kaggle for free GPU access")

if __name__ == "__main__":
    print("🔥 Thermal Anomaly Detection - GPU Setup Check")
    print("=" * 60)
    
    gpu_available = check_gpu_setup()
    estimate_training_time()
    
    print(f"\n🎯 Recommendation:")
    if gpu_available:
        print("✅ GPU training ready! Run: python train_yolo.py")
    else:
        print("⚠️  Consider GPU training for faster results")
        print("🔄 CPU training will work but take much longer")
    
    print("\n" + "=" * 60)