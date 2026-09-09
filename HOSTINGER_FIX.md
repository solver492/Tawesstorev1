# 🔧 Guide de Correction SSH pour Hostinger

## Connexion SSH

```bash
ssh -p 65002 u696346042@147.93.54.128
# Mot de passe : denden7skY-
```

## Étapes de correction une fois connecté

### 1. Trouver le répertoire de votre application

```bash
cd ~
ls -la
# Cherchez un dossier comme "domains" ou "public_html" ou votre nom de site
```

Si vous êtes dans Hostinger App, le chemin sera probablement :
```bash
cd ~/domains/pubastack.space/
# ou
cd ~/applications/pubastack.space/
```

### 2. Vérifier le contenu

```bash
pwd
ls -la
```

### 3. Naviguer vers le dépôt Git

```bash
cd application  # ou le nom du dossier de votre app
git status
```

### 4. Configurer pnpm pour autoriser les scripts

```bash
# Autoriser les scripts unsafe
pnpm config set unsafe-perm true

# Vérifier la configuration
pnpm config get unsafe-perm
```

### 5. Nettoyer et réinstaller les dépendances

```bash
# Supprimer node_modules et le cache
rm -rf node_modules
rm -rf .pnpm-store

# Réinstaller avec force
pnpm install --force --no-frozen-lockfile
```

### 6. Approuver les scripts de build

```bash
# Créer un fichier .pnpmrc dans le home directory
cat > ~/.pnpmrc << EOF
unsafe-perm=true
enable-pre-post-scripts=true
EOF
```

### 7. Réinstaller et builder

```bash
# Retour au dossier de l'app
cd ~/domains/pubastack.space/application  # Ajustez le chemin

# Réinstaller
pnpm install

# Builder
pnpm run build:prod
# ou si ça ne marche pas :
pnpm --filter @workspace/tawes-store run build
```

### 8. Vérifier que le build a réussi

```bash
ls -la artifacts/tawes-store/dist/public/
# Vous devriez voir index.html et les assets
```

## 🚨 Si vous avez des erreurs

### Erreur : "Ignored build scripts"

```bash
# Solution 1 : Forcer l'installation
pnpm install --force --shamefully-hoist

# Solution 2 : Installer chaque workspace séparément
pnpm install --workspace-root
pnpm --filter @workspace/tawes-store install
```

### Erreur : "Cannot find module"

```bash
# Nettoyer complètement
rm -rf node_modules pnpm-lock.yaml
pnpm install --no-frozen-lockfile
```

### Erreur : "Permission denied"

```bash
# Donner les bonnes permissions
chmod -R 755 .
chmod +x build.sh
```

## 🎯 Script de déploiement complet

Créez un fichier `deploy.sh` :

```bash
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Configuration pnpm
pnpm config set unsafe-perm true
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Variables d'environnement
export NODE_ENV=production
export PORT=5173
export BASE_PATH=/

# Nettoyer
echo "🧹 Cleaning..."
rm -rf node_modules/.pnpm

# Installer
echo "📦 Installing dependencies..."
pnpm install --force --no-frozen-lockfile || {
    echo "❌ Installation failed, trying alternative method..."
    pnpm install --shamefully-hoist
}

# Builder
echo "🔨 Building..."
pnpm run build:prod || pnpm --filter @workspace/tawes-store run build

echo "✅ Deployment complete!"
echo "📁 Build output at: artifacts/tawes-store/dist/public"
ls -la artifacts/tawes-store/dist/public/
EOF

chmod +x deploy.sh
```

Puis exécutez :
```bash
./deploy.sh
```

## 🔄 Après la correction

1. Dans le panneau Hostinger, allez dans **"Déploiements"**
2. Cliquez sur **"Redéployer"** ou **"Déclencher le déploiement"**
3. L'application devrait maintenant se builder correctement

## 📝 Configuration finale dans Hostinger

Dans les paramètres de compilation :

**Commande de compilation** :
```bash
pnpm config set unsafe-perm true && pnpm install --force && pnpm run build
```

**Répertoire de sortie** :
```
artifacts/tawes-store/dist/public
```

## 🆘 Besoin d'aide ?

Si vous êtes bloqué à une étape, envoyez-moi :
1. Le résultat de `pwd`
2. Le résultat de `ls -la`
3. Le message d'erreur complet
