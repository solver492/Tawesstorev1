# 🚀 Solution Rapide - À exécuter manuellement

## Étape 1 : Ouvrir PowerShell et se connecter

```powershell
ssh -p 65002 u696346042@147.93.54.128
```
**Mot de passe :** `denden7skY-`

---

## Étape 2 : Une fois connecté, copier-coller ces commandes UNE PAR UNE

### A. Trouver votre application
```bash
cd ~/domains
ls -la
```

### B. Entrer dans le dossier de votre site (remplacez par le nom que vous voyez)
```bash
cd pubastack.space
ls -la
```

### C. Chercher le dossier de l'application Node.js
```bash
find . -name "package.json" -type f | head -5
```

### D. Aller dans ce dossier (ajustez le chemin selon ce que vous voyez)
```bash
cd application
# ou
cd public_html
# Vérifiez avec: cat package.json | grep "workspace"
```

---

## Étape 3 : Configurer et installer

```bash
# Créer configuration pnpm
cat > .pnpmrc << 'EOF'
unsafe-perm=true
enable-pre-post-scripts=true
EOF

# Configuration globale
pnpm config set unsafe-perm true

# Nettoyer
rm -rf node_modules/.pnpm

# Installer
pnpm install --force --no-frozen-lockfile
```

---

## Étape 4 : Builder

```bash
# Définir les variables
export NODE_ENV=production
export PORT=5173
export BASE_PATH=/

# Builder
pnpm run build:prod
```

**Si erreur, essayez :**
```bash
pnpm --filter @workspace/tawes-store run build
```

---

## Étape 5 : Vérifier

```bash
ls -la artifacts/tawes-store/dist/public/
```

Vous devriez voir :
- ✅ `index.html`
- ✅ Dossier `assets/` avec des fichiers `.js` et `.css`

---

## ✅ Si tout fonctionne

Retournez dans Hostinger → Déploiements → Cliquez sur "Redéployer"

---

## 📋 Commandes complètes (à copier d'un coup si vous préférez)

```bash
cd ~/domains/pubastack.space/application && \
cat > .pnpmrc << 'EOF'
unsafe-perm=true
enable-pre-post-scripts=true
EOF
pnpm config set unsafe-perm true && \
rm -rf node_modules/.pnpm && \
pnpm install --force --no-frozen-lockfile && \
export NODE_ENV=production PORT=5173 BASE_PATH=/ && \
pnpm run build:prod && \
ls -la artifacts/tawes-store/dist/public/
```

**⚠️ Ajustez `pubastack.space/application` selon votre structure réelle !**
