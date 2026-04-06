#!/bin/bash

echo "🚀 Deploying Python Pathao Tracker to Render..."

# Check if GitHub remote is set
if ! git remote get-url origin &>/dev/null; then
    echo "❌ Please set up GitHub remote first:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/pathao-tracker.git"
    echo "   git push -u origin main"
    exit 1
fi

# Deploy to Render using CLI
echo "📦 Creating Render service..."
render services create \
    --name pathao-tracker-api \
    --type web_service \
    --runtime python \
    --repo $(git remote get-url origin) \
    --plan free \
    --build-command "pip install -r requirements.txt && playwright install chromium" \
    --start-command "gunicorn server:app" \
    --health-check-path "/" \
    --confirm \
    --output json

echo "✅ Deployment initiated! Check your Render dashboard for progress."
echo "🌐 Your API will be available at: https://pathao-tracker-api.onrender.com"
