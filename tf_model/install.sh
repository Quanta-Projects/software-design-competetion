#!/bin/bash

echo "========================================"
echo "  Transformer Defect Detection Setup"
echo "========================================"

cd "$(dirname "$0")"

# Check Python installation
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.9+ first."
    echo "   Ubuntu/Debian: sudo apt install python3 python3-pip"
    echo "   macOS: brew install python3"
    echo "   Or download from: https://www.python.org/downloads/"
    exit 1
fi

python3 --version

echo ""
echo "Setup Options:"
echo "  1. Install with GPU support (NVIDIA GPU required)"
echo "  2. Install CPU-only version"  
echo "  3. Auto-detect (recommended)"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "Installing with GPU support..."
        python3 setup.py --gpu
        ;;
    2)
        echo "Installing CPU-only version..."
        python3 setup.py --cpu
        ;;
    3)
        echo "Auto-detecting system configuration..."
        python3 setup.py
        ;;
    *)
        echo "Invalid choice. Using auto-detect..."
        python3 setup.py
        ;;
esac

echo ""
echo "Setup completed!"
echo "Run 'source activate_env.sh' to start using the system."
echo ""