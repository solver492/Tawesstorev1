#!/bin/bash
# Script de build pour Hostinger

echo "🚀 Starting build process..."

# Approuver tous les scripts de build
echo "📦 Approving build scripts..."
pnpm config set unsafe-perm true

# Installation avec approbation automatique des builds
echo "📥 Installing dependencies..."
pnpm install --no-frozen-lockfile || pnpm install --force

# Build du projet
echo "🔨 Building project..."
pnpm run build:prod || pnpm --filter @workspace/tawes-store run build

echo "✅ Build complete!"
