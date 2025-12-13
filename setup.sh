#!/bin/bash

# glyphHash Setup Script
# This script sets up the complete development environment

set -e  # Exit on any error

echo "🚀 glyphHash Setup Script"
echo "========================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 20.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be >= 20.0.0 (current: $(node -v))"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker"
    exit 1
fi
echo "✅ Docker $(docker --version)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose"
    exit 1
fi
echo "✅ Docker Compose $(docker-compose --version)"

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Setting up environment files..."

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your Hedera credentials!"
else
    echo "✅ .env already exists"
fi

# Create web .env.local if it doesn't exist
if [ ! -f apps/web/.env.local ]; then
    echo "Creating apps/web/.env.local from example..."
    cp apps/web/.env.local.example apps/web/.env.local
    echo "⚠️  Please edit apps/web/.env.local with your Clerk credentials!"
else
    echo "✅ apps/web/.env.local already exists"
fi

echo ""
echo "🐳 Starting Docker services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is ready
until docker exec glyphhash-postgres pg_isready -U glyphhash > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

echo ""
echo "📊 Setting up database..."
cd apps/api

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env with your Hedera testnet credentials"
echo "2. Edit apps/web/.env.local with your Clerk API keys"
echo "3. Run 'npm run dev' to start all services"
echo ""
echo "🌐 Services will be available at:"
echo "   - API: http://localhost:4000"
echo "   - API Docs: http://localhost:4000/api/docs"
echo "   - Web: http://localhost:3000"
echo "   - Prisma Studio: npm run db:studio"
echo ""
echo "Happy coding! 🎉"
