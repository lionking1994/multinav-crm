#!/bin/bash

echo "================================================"
echo "MultiNav iCRM - Quick Deployment Script"
echo "================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ NPM version: $(npm -v)"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local file not found. Creating from template..."
    cp env.example .env.local
    echo "📝 Please edit .env.local with your actual credentials:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo "   - VITE_GEMINI_API_KEY"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "Choose deployment option:"
echo "1) Run development server (http://localhost:5173)"
echo "2) Build for production"
echo "3) Preview production build (http://localhost:4173)"
echo "4) Deploy to Vercel"
echo "5) Deploy to Netlify"
echo ""

read -p "Enter option (1-5): " option

case $option in
    1)
        echo "🚀 Starting development server..."
        npm run dev
        ;;
    2)
        echo "🔨 Building for production..."
        npm run build
        echo "✅ Build complete! Files in ./dist/"
        echo ""
        echo "To deploy:"
        echo "- Upload contents of ./dist/ to your web server"
        echo "- Or use option 4 or 5 for automated deployment"
        ;;
    3)
        echo "👀 Starting production preview..."
        npm run build
        npm run preview
        ;;
    4)
        echo "🚀 Deploying to Vercel..."
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm i -g vercel
        fi
        vercel --prod
        ;;
    5)
        echo "🚀 Deploying to Netlify..."
        if ! command -v netlify &> /dev/null; then
            echo "Installing Netlify CLI..."
            npm i -g netlify-cli
        fi
        npm run build
        netlify deploy --prod --dir=dist
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac






