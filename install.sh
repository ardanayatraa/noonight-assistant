#!/usr/bin/env bash
set -euo pipefail

echo "🛸 Noonight Assistant — Installer"
echo "=================================="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install: https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required."; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git is required."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "⚠️  Docker not found. You can still run without Docker."; }

echo "✅ Prerequisites OK"
echo ""

# Copy .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created .env — edit with your API keys and database URL"
else
  echo "📝 .env already exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."

echo "  → Root"
npm install --silent

echo "  → Backend (NestJS API)"
cd src && npm install --silent && cd ..

echo "  → Frontend (Next.js)"
cd frontend && npm install --silent && cd ..

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
cd src && npx prisma generate && cd ..

echo ""
echo "=================================="
echo "✅ Installation complete!"
echo ""
echo "Quick start:"
echo "  npm run dev           # Start both API + Dashboard"
echo ""
echo "Or with Docker:"
echo "  docker compose up -d"
echo ""
echo "First-time setup:"
echo "  1. Edit .env with your API keys"
echo "  2. Set DATABASE_URL to your MySQL server"
echo "  3. Run: cd src && npx prisma migrate dev"
echo "  4. Open http://localhost:3001/api/v1/health"
echo ""
