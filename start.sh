#!/bin/bash

# Activate Python virtual environment
source /opt/venv/bin/activate

# Start Python prediction API in the background
echo "Starting Python prediction service..."
python python/predict_service/main.py &

# Start Next.js app in the foreground
echo "Starting Next.js application..."
exec pnpm start
