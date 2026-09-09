#!/bin/bash
# Script à exécuter sur le serveur Hostinger

set -e

echo "=== 1. Navigation vers le projet ==="
cd ~/domains/pubstack.space/hbuilds
ls -la
pwd

echo ""
echo "=== 2. Recherche du dossier de l'application ==="
find . -maxdepth 2 -name "package.json" -type f

echo ""
echo "=== 3. Détermination du dossier correct ==="
APP_DIR=$(find . -maxdepth 2 -name "package.json" -type f | grep -v node_modules | head -1 | xargs dirname)
echo "Dossier trouvé: $APP_DIR"
cd "$APP_DIR"
pwd

echo ""
echo "=== 4. Vérification du package.json ==="
cat package.json | grep -A 2 '"name"'

echo ""
echo "=== 5. Configuration pnpm ==="
cat > .pnpmrc << 'EOF'
unsafe-perm=true
enable-pre-post-scripts=true
EOF

pnpm config set unsafe-perm true
echo "Configuration pnpm OK"

echo ""
echo "=== 6. Nettoyage ==="
rm -rf node_modules/.pnpm 2>/dev/null || true
echo "Nettoyage OK"

echo ""
echo "=== 7. Installation des dépendances ==="
pnpm install --force --no-frozen-lockfile

echo ""
echo "=== 8. Build de production ==="
export NODE_ENV=production
export PORT=5173
export BASE_PATH=/
export SUPABASE_URL=https://nfoefhwmgjatbqyibclp.supabase.co
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mb2VmaHdtZ2phdGJxeWliY2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM4NDAxNywiZXhwIjoyMTAzOTYwMDE3fQ.y3ycIHJDwu1FuJH5FE17wX-zOuVZUUBIztLEaNmVLhg

pnpm run build:prod || pnpm --filter @workspace/tawes-store run build

echo ""
echo "=== 9. Vérification du build ==="
if [ -d "artifacts/tawes-store/dist/public" ]; then
    echo "✅ BUILD RÉUSSI!"
    ls -lah artifacts/tawes-store/dist/public/
    du -sh artifacts/tawes-store/dist/public/
else
    echo "❌ BUILD ÉCHOUÉ - Dossier de sortie introuvable"
    find . -name "dist" -type d
    exit 1
fi

echo ""
echo "=== ✅ TERMINÉ AVEC SUCCÈS ==="
