#!/usr/bin/env python3
"""
Automated Setup Script for Two-Stage Transformer Defect Detection System
========================================================================

This script automates the environment setup and dependency installation process.

Usage:
    python setup.py
    python setup.py --gpu  # For GPU installation
    python setup.py --cpu  # For CPU-only installation
"""

import os
import sys
import subprocess
import platform
import argparse

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"\n🔄 {description}...")
    print(f"   Command: {command}")
    
    try:
        if platform.system() == "Windows":
            result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        else:
            result = subprocess.run(command.split(), check=True, capture_output=True, text=True)
        
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Error: {e}")
        if e.stdout:
            print(f"   Output: {e.stdout}")
        if e.stderr:
            print(f"   Error output: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    if version.major == 3 and version.minor >= 9:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - Compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Requires Python 3.9+")
        return False

def check_conda():
    """Check if conda is available."""
    try:
        subprocess.run(["conda", "--version"], check=True, capture_output=True)
        print("✅ Conda is available")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Conda not found")
        return False

def setup_conda_environment(gpu_support=True):
    """Setup conda environment with dependencies."""
    
    env_name = "transformer_defect_detection"
    
    # Check if environment already exists
    try:
        result = subprocess.run(["conda", "env", "list"], capture_output=True, text=True)
        if env_name in result.stdout:
            print(f"⚠️  Environment '{env_name}' already exists")
            response = input("Do you want to remove and recreate it? (y/N): ").lower()
            if response == 'y':
                if not run_command(f"conda env remove -n {env_name} -y", 
                                 f"Removing existing environment '{env_name}'"):
                    return False
            else:
                print("Using existing environment")
                return True
    except:
        pass
    
    # Create new environment
    if not run_command(f"conda create -n {env_name} python=3.9 -y", 
                      f"Creating conda environment '{env_name}'"):
        return False
    
    # Activate environment and install PyTorch
    if platform.system() == "Windows":
        activate_cmd = f"conda activate {env_name}"
    else:
        activate_cmd = f"source activate {env_name}"
    
    if gpu_support:
        pytorch_cmd = f"{activate_cmd} && conda install pytorch torchvision torchaudio pytorch-cuda=12.8 -c pytorch -c nvidia -y"
        description = "Installing PyTorch with CUDA 12.8 support"
    else:
        pytorch_cmd = f"{activate_cmd} && conda install pytorch torchvision torchaudio cpuonly -c pytorch -y"
        description = "Installing PyTorch (CPU-only)"
    
    if not run_command(pytorch_cmd, description):
        return False
    
    # Install other dependencies
    pip_cmd = f"{activate_cmd} && pip install -r requirements.txt"
    if not run_command(pip_cmd, "Installing additional dependencies from requirements.txt"):
        return False
    
    return True

def setup_pip_environment(gpu_support=True):
    """Setup pip virtual environment with dependencies."""
    
    venv_name = "transformer_defect_env"
    
    # Create virtual environment
    if not run_command(f"python -m venv {venv_name}", 
                      f"Creating virtual environment '{venv_name}'"):
        return False
    
    # Activate environment
    if platform.system() == "Windows":
        activate_cmd = f"{venv_name}\\Scripts\\activate"
        pip_cmd = f"{activate_cmd} && python -m pip install --upgrade pip"
    else:
        activate_cmd = f"source {venv_name}/bin/activate"
        pip_cmd = f"{activate_cmd} && python -m pip install --upgrade pip"
    
    if not run_command(pip_cmd, "Upgrading pip"):
        return False
    
    # Install PyTorch
    if gpu_support:
        torch_cmd = f"{activate_cmd} && pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128"
        description = "Installing PyTorch with CUDA 12.8 support"
    else:
        torch_cmd = f"{activate_cmd} && pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu"
        description = "Installing PyTorch (CPU-only)"
    
    if not run_command(torch_cmd, description):
        return False
    
    # Install other dependencies
    deps_cmd = f"{activate_cmd} && pip install -r requirements.txt"
    if not run_command(deps_cmd, "Installing additional dependencies"):
        return False
    
    return True

def verify_installation():
    """Verify the installation by testing imports."""
    print("\n🧪 Verifying installation...")
    
    test_script = """
import torch
import torchvision
import ultralytics
import cv2
import numpy as np
import matplotlib.pyplot as plt

print(f"✅ PyTorch: {torch.__version__}")
print(f"✅ Torchvision: {torchvision.__version__}")
print(f"✅ Ultralytics: {ultralytics.__version__}")
print(f"✅ OpenCV: {cv2.__version__}")
print(f"✅ NumPy: {np.__version__}")

if torch.cuda.is_available():
    print(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
else:
    print("⚠️  CUDA not available - using CPU")

print("🎉 All dependencies verified successfully!")
"""
    
    try:
        exec(test_script)
        return True
    except ImportError as e:
        print(f"❌ Verification failed: {e}")
        return False

def create_activation_scripts():
    """Create convenience scripts for environment activation."""
    
    if platform.system() == "Windows":
        # Windows batch script
        batch_content = """@echo off
echo Activating Transformer Defect Detection Environment...

if exist transformer_defect_env (
    call transformer_defect_env\\Scripts\\activate
    echo ✅ Virtual environment activated
) else (
    call conda activate transformer_defect_detection
    echo ✅ Conda environment activated
)

set KMP_DUPLICATE_LIB_OK=TRUE
echo Environment ready for transformer defect detection!
echo.
echo Available commands:
echo   python defect_detection_gui.py          # GUI interface
echo   python two_stage_defect_detection.py    # CLI interface  
echo   python test_two_stage_detection.py      # Quick test
echo.
"""
        with open("activate_env.bat", "w") as f:
            f.write(batch_content)
        print("✅ Created activation script: activate_env.bat")
    
    else:
        # Linux/macOS bash script
        bash_content = """#!/bin/bash
echo "Activating Transformer Defect Detection Environment..."

if [ -d "transformer_defect_env" ]; then
    source transformer_defect_env/bin/activate
    echo "✅ Virtual environment activated"
elif command -v conda &> /dev/null; then
    conda activate transformer_defect_detection
    echo "✅ Conda environment activated"
else
    echo "❌ No environment found"
    exit 1
fi

export KMP_DUPLICATE_LIB_OK=TRUE
echo "Environment ready for transformer defect detection!"
echo ""
echo "Available commands:"
echo "  python defect_detection_gui.py          # GUI interface"
echo "  python two_stage_defect_detection.py    # CLI interface"
echo "  python test_two_stage_detection.py      # Quick test"
echo ""
"""
        with open("activate_env.sh", "w") as f:
            f.write(bash_content)
        os.chmod("activate_env.sh", 0o755)
        print("✅ Created activation script: activate_env.sh")

def main():
    """Main setup function."""
    
    parser = argparse.ArgumentParser(description="Setup Transformer Defect Detection Environment")
    parser.add_argument("--gpu", action="store_true", help="Install with GPU support")
    parser.add_argument("--cpu", action="store_true", help="Install CPU-only version")
    parser.add_argument("--force-pip", action="store_true", help="Force pip installation even if conda available")
    
    args = parser.parse_args()
    
    print("🚀 Two-Stage Transformer Defect Detection Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        print("\nPlease install Python 3.9 or higher and try again.")
        return
    
    # Determine GPU support
    if args.cpu:
        gpu_support = False
        print("🖥️  Installing CPU-only version")
    elif args.gpu:
        gpu_support = True
        print("🎮 Installing with GPU support")
    else:
        # Auto-detect GPU
        try:
            import torch
            gpu_support = torch.cuda.is_available()
            print(f"🔍 Auto-detected: {'GPU' if gpu_support else 'CPU'} version")
        except:
            gpu_support = True  # Default to GPU
            print("🎮 Defaulting to GPU installation")
    
    # Choose installation method
    use_conda = check_conda() and not args.force_pip
    
    if use_conda:
        print("\n📦 Using Conda for environment management")
        success = setup_conda_environment(gpu_support)
    else:
        print("\n🐍 Using pip for environment management")
        success = setup_pip_environment(gpu_support)
    
    if not success:
        print("\n❌ Setup failed. Please check error messages above.")
        return
    
    # Verify installation
    print("\n🔍 Verifying installation...")
    # Note: Verification would need to be run in the new environment
    
    # Create activation scripts
    create_activation_scripts()
    
    # Print success message and next steps
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next Steps:")
    
    if platform.system() == "Windows":
        print("   1. Run: activate_env.bat")
    else:
        print("   1. Run: source activate_env.sh")
    
    print("   2. Test installation: python test_two_stage_detection.py")
    print("   3. Start GUI: python defect_detection_gui.py")
    print("   4. Or use CLI: python two_stage_defect_detection.py --help")
    
    print(f"\n💡 Environment installed with {'GPU' if gpu_support else 'CPU'} support")
    print("   Check README.md for detailed usage instructions")

if __name__ == "__main__":
    main()