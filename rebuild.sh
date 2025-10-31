#!/bin/bash

echo "🔨 Rebuilding project..."
npm run build

echo "🔄 Restarting preview server..."
pkill -f "vite preview"
sleep 1
nohup npx vite preview > /dev/null 2>&1 &

echo "✅ Done! Server restarted with latest changes"
echo "📍 Access at: http://localhost:4173"






