#!/bin/bash

# GlyphHash Setup Script
# ======================
# This script sets up the development environment

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   🔐 GlyphHash Setup                                          ║"
echo "║   Blockchain-Verified Compliance Auditing                     ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ is required. Current: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "⚠️  Docker not found. Install Docker to run the database."
else
  echo "✅ Docker $(docker -v | cut -d' ' -f3 | tr -d ',')"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build packages
echo ""
echo "🔨 Building packages..."
npm run build --workspace=@glyphhash/types
npm run build --workspace=@glyphhash/hedera

# Check for .env file
if [ ! -f .env ]; then
  echo ""
  echo "📝 Creating .env from example..."
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: Edit .env with your Hedera testnet credentials!"
  echo "   Get credentials at: https://portal.hedera.com"
fi

# Start Docker services
if command -v docker &> /dev/null; then
  echo ""
  echo "🐳 Starting Docker services..."
  docker-compose up -d postgres
  
  # Wait for PostgreSQL to be ready
  echo "⏳ Waiting for PostgreSQL..."
  sleep 5
fi

# Run Prisma migrations
echo ""
echo "🗄️  Running database migrations..."
cd apps/api
npx prisma generate
npx prisma db push
cd ../..

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   ✅ Setup Complete!                                          ║"
echo "║                                                               ║"
echo "║   Next steps:                                                 ║"
echo "║   1. Edit .env with your Hedera testnet credentials          ║"
echo "║   2. Run: npm run dev                                        ║"
echo "║   3. Open: http://localhost:3000                             ║"
echo "║   4. Try the demo: http://localhost:3000/demo                ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
