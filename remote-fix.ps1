# Script PowerShell pour corriger l'installation Hostinger
$host_addr = "147.93.54.128"
$port = "65002"
$user = "u696346042"
$pass = "denden7skY-"

Write-Host "🔧 Connexion au serveur Hostinger..." -ForegroundColor Cyan

# Créer le script à exécuter
$remoteScript = @'
# Configuration
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

echo "=== Recherche du répertoire ==="
cd ~
pwd

# Trouver l'application
APP_DIR=""
for dir in domains/*/application applications/* public_html; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        APP_DIR="$dir"
        break
    fi
done

if [ -z "$APP_DIR" ]; then
    echo "Chemins testés:"
    ls -la domains/ 2>/dev/null || echo "Pas de dossier domains"
    ls -la applications/ 2>/dev/null || echo "Pas de dossier applications"
    exit 1
fi

cd "$APP_DIR"
echo "=== Trouvé: $APP_DIR ==="
pwd

# Configuration pnpm globale
mkdir -p ~/.local/share/pnpm
cat > ~/.pnpmrc << 'EOF'
unsafe-perm=true
enable-pre-post-scripts=true
EOF

# Configuration pnpm locale
cat > .pnpmrc << 'EOF'
unsafe-perm=true
enable-pre-post-scripts=true
EOF

pnpm config set unsafe-perm true

echo "=== Installation ==="
rm -rf node_modules/.pnpm 2>/dev/null
pnpm install --force --no-frozen-lockfile

echo "=== Build ==="
export NODE_ENV=production
export PORT=5173
export BASE_PATH=/
pnpm run build:prod || pnpm --filter @workspace/tawes-store run build

echo "=== Résultat ==="
if [ -d "artifacts/tawes-store/dist/public" ]; then
    echo "✅ SUCCESS!"
    ls -la artifacts/tawes-store/dist/public/
else
    echo "❌ FAILED"
fi
'@

# Sauvegarder le script
$remoteScript | Out-File -FilePath "temp_remote_script.sh" -Encoding UTF8 -NoNewline

Write-Host "📤 Envoi du script au serveur..." -ForegroundColor Yellow

# Utiliser plink si disponible, sinon ssh
$sshCommand = "ssh -p $port ${user}@${host_addr}"

Write-Host @"

⚠️  ATTENTION: Ce script nécessite une connexion SSH interactive.

Vous devez exécuter manuellement:

1. Ouvrir un terminal PowerShell ou Git Bash
2. Exécuter: ssh -p $port ${user}@${host_addr}
3. Entrer le mot de passe: $pass
4. Copier et coller les commandes du fichier: HOSTINGER_FIX.md

Ou utilisez PuTTY avec ces paramètres:
- Host: $host_addr
- Port: $port
- Username: $user
- Password: $pass

"@ -ForegroundColor Green

Write-Host "📋 Instructions détaillées dans HOSTINGER_FIX.md" -ForegroundColor Cyan

# Ouvrir le fichier d'instructions
if (Test-Path "HOSTINGER_FIX.md") {
    notepad.exe "HOSTINGER_FIX.md"
}
