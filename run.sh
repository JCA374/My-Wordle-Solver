#!/bin/bash

# Wordle Solver - Run Script
# This script starts the Flask web application

echo "🎯 Starting Wordle Solver..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Change to app directory and run
echo ""
echo "Starting Flask server..."
echo "🌐 Open your browser to: http://localhost:5000"
echo ""
cd app && python app.py
