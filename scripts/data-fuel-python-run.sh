#!/bin/bash

# Navigate to the prediction service directory
cd /home/vicent/Documents/NextJs/data-fuel/python/predict_service

# Source the venv
source .venv/bin/activate

# Start the prediction API
python main.py
