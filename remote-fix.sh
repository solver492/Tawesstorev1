#!/bin/bash
# Script pour corriger l'installation sur Hostinger via SSH

HOST="147.93.54.128"
PORT="65002"
USER="u696346042"
PASS="denden7skY-"

# Commandes à exécuter sur le serveur
COMMANDS=$(cat << 'ENDSSH'
# Configuration
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Trouver le répertoire de l'application
echo "=== Recherche du répertoire de l'application ==="
cd ~
pwd
ls -la

# Essayer différents chemins possibles
if [ -d "domains/pubastack.space/application" ]; then
    cd domains/pubastack.space/application
elif [ -d "applications/pubastack.space" ]; then
    cd applications/pubastack.space
elif [ -d "public_html" ]; then
    cd public_html
else
    echo "⚠️  Répertoire de l'application introuvable"
    echo "Répertoires disponibles:"
    ls -la
    exit 1
fi

echo "=== Répertoire actuel ==="
pwd
ls -la

# Configuration pnpm
echo "=== Configuration pnpm ==="
pnpm config set unsafe-perm true
pnpm config set enable-pre-post-scripts true

# Créer .pnpmrc global
cat > ~/.pnpmrc << 'EOF'
unsafe-perm=true
enable-pre-post-scripts=true
shamefully-hoist=false
EOF

# Créer .pnpmrc local dans le projet
cat > .pnpmrc << 'EOF'
unsafe-perm=true
enable-pre-post-scripts=true
EOF

# Nettoyer
echo "=== Nettoyage ==="
rm -rf node_modules/.pnpm 2>/dev/null || true

# Installation
echo "=== Installation des dépendances ==="
pnpm install --force --no-frozen-lockfile

# Build
echo "=== Build du projet ==="
export NODE_ENV=production
export PORT=5173
export BASE_PATH=/
pnpm run build:prod || pnpm --filter @workspace/tawes-store run build

# Vérification
echo "=== Vérification du build ==="
if [ -d "artifacts/tawes-store/dist/public" ]; then
    echo "✅ Build réussi!"
    ls -la artifacts/tawes-store/dist/public/
else
    echo "❌ Le build a échoué"
    exit 1
fi
ENDSSH
)

# Exécution via SSH
echo "$COMMANDS" | ssh -p $PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $USER@$HOST
