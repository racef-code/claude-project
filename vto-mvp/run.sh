#!/bin/bash

# Virtual Try-On MVP Launcher
# This script checks setup and runs the Flask application

set -e

echo "=========================================="
echo "Virtual Try-On MVP"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo ""
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "📝 Please edit .env and add your GOOGLE_API_KEY"
    echo "   Then run this script again."
    echo ""
    exit 1
fi

# Check if API key is configured
if grep -q "your_api_key_here" .env; then
    echo "⚠️  WARNING: GOOGLE_API_KEY not configured!"
    echo ""
    echo "📝 Please edit .env and add your actual GOOGLE_API_KEY"
    echo "   Get your API key from: https://aistudio.google.com/app/apikey"
    echo ""
    exit 1
fi

# Check dependencies
echo "Checking dependencies..."
python3 -c "import flask, google.generativeai, PIL, dotenv" 2>/dev/null || {
    echo "⚠️  Some dependencies are missing."
    echo ""
    echo "Installing dependencies..."
    pip install -r requirements.txt
    echo ""
}

echo "✓ Dependencies OK"
echo ""

# Check if catalog images exist
IMAGE_COUNT=$(ls static/catalog/*.jpg 2>/dev/null | wc -l)
if [ "$IMAGE_COUNT" -eq 0 ]; then
    echo "ℹ️  No catalog images found."
    echo ""
    read -p "Create placeholder images? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        python3 create_placeholders.py
    fi
    echo ""
fi

echo "Starting Flask application..."
echo ""
echo "🌐 Visit: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the app
python3 app.py
