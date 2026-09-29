# 🚀 Guide de Déploiement sur Hostinger

## Prérequis

- Compte Hostinger avec hébergement Node.js
- Accès GitHub configuré
- Node.js v22.x ou supérieur
- pnpm installé

## 📋 Configuration sur Hostinger

### 1. Configuration de l'application

Dans le panneau Hostinger :
- **Framework** : `Other`
- **Branche** : `main`
- **Version Node** : `22.x`
- **Répertoire root** : `/`

### 2. Paramètres de compilation

#### Build Command (Commande de compilation)
```bash
pnpm install && pnpm run build:prod
```

#### Output Directory (Répertoire de sortie)
```
artifacts/tawes-store/dist/public
```

#### Start Command (Commande de démarrage)
```bash
pnpm start
```

### 3. Variables d'environnement

Ajoutez ces variables dans la section "Variables d'environnement" de Hostinger :

```env
# Supabase Configuration
SUPABASE_URL=https://nfoefhwmgjatbqyibclp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mb2VmaHdtZ2phdGJxeWliY2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM4NDAxNywiZXhwIjoyMTAzOTYwMDE3fQ.y3ycIHJDwu1FuJH5FE17wX-zOuVZUUBIztLEaNmVLhg

# Database URL (remplacez YOUR-PASSWORD par votre mot de passe Supabase)
DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.nfoefhwmgjatbqyibclp.supabase.co:5432/postgres

# Vite Configuration
PORT=5173
BASE_PATH=/

# Node Environment
NODE_ENV=production
```

⚠️ **Important** : Remplacez `YOUR-PASSWORD` par votre vrai mot de passe de base de données Supabase.

## 📦 Déploiement depuis GitHub

### Étape 1 : Pousser le code sur GitHub

```bash
git add .
git commit -m "Préparation pour déploiement Hostinger"
git push origin main
```

### Étape 2 : Connecter GitHub à Hostinger

1. Dans le panneau Hostinger, allez dans **Applications**
2. Cliquez sur **Nouvelle Application**
3. Sélectionnez **GitHub**
4. Autorisez Hostinger à accéder à votre dépôt
5. Sélectionnez le dépôt `Tawesstorev1`
6. Configurez selon les paramètres ci-dessus

### Étape 3 : Configuration automatique

Hostinger va automatiquement :
- Cloner votre dépôt
- Installer les dépendances avec pnpm
- Builder l'application
- Démarrer le serveur

## 🔄 Déploiements futurs

Après la configuration initiale, chaque `git push` sur la branche `main` déclenchera automatiquement un nouveau déploiement.

## 🐛 Dépannage

### Problème : Les produits ne s'affichent pas

1. Vérifiez que Supabase est correctement configuré
2. Vérifiez les variables d'environnement dans Hostinger
3. Consultez les logs de l'application dans le panneau Hostinger

### Problème : Erreur de build

1. Vérifiez que la version de Node.js est 22.x
2. Assurez-vous que toutes les dépendances sont installées
3. Vérifiez les logs de build dans Hostinger

### Problème : L'application ne démarre pas

1. Vérifiez que les variables `PORT` et `BASE_PATH` sont définies
2. Consultez les logs d'exécution
3. Vérifiez que le répertoire de sortie est correct

## 📱 Accès à l'application

Une fois déployée, votre application sera accessible à l'URL fournie par Hostinger :
```
https://votre-app.hostinger.app
```

ou votre domaine personnalisé si configuré.

## 🔗 Connexion avec Supabase

L'application se connectera automatiquement à votre base de données Supabase avec les credentials fournis. Assurez-vous que :

1. Votre base de données Supabase est active
2. Les tables nécessaires sont créées
3. Les politiques RLS (Row Level Security) sont configurées correctement

## 📝 Notes importantes

- Le fichier `.env` n'est pas poussé sur GitHub (protégé par `.gitignore`)
- Utilisez toujours `.env.example` comme référence pour les variables nécessaires
- Les variables d'environnement doivent être configurées dans Hostinger, pas dans le code
- Pour le développement local, copiez `.env.example` vers `.env` et remplissez vos valeurs

## 🆘 Support

Pour toute question ou problème :
1. Consultez la documentation Hostinger
2. Vérifiez la documentation Supabase
3. Consultez les logs de l'application dans le panneau Hostinger

---

## ✅ Procédure vérifiée (2026-09-29)

Deux sites distincts, deux stratégies de build不同的. Ne pas mélanger les deux.

### Backend de gestion — `gestion-tawes.pubstack.space`

| Champ | Valeur |
| --- | --- |
| Type d'application | `express` |
| Node | `22` |
| Root directory | `artifacts/admin` |
| Entry file | `src/server.js` |
| Build script | `build` (`node --check src/server.js`) |
| Package manager | `npm` |

Variables d'environnement (API `PUT .../nodejs/builds/settings/env`, **remplace tout** l'ensemble) :
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_PASSWORD`, `MARGIN_DH`, `ADMIN_ALLOWED_ORIGIN`, `NODE_ENV`.
`PORT` est fourni par l'hébergeur, ne pas le définir.

### Boutique — `pubstack.space`

**Le build Git échoue systématiquement sur cet hébergeur** : l'installation des dépendances
du monorepo s'arrête sur `spawnSync .../esbuild/bin/esbuild EACCES` (le binaire natif esbuild
n'est pas exécutable dans le répertoire de build). Aucun réglage pnpm (`allowBuilds`,
`onlyBuiltDependencies`) ne corrige cela.

Déploiement utilisé à la place — build local + archive pré-construite :

1. `pnpm run build` en local (le bundle contient `VITE_SUPABASE_ANON_KEY`).
2. Copier `artifacts/tawes-store/dist/public` + un `package.json` minimal dont le script
   `build` est un no-op, puis `tar -czf boutique.tar.gz`.
3. Upload TUS de l'archive dans `public_html` (`POST /api/hosting/v1/files/upload-urls`).
4. `POST /api/hosting/v1/accounts/{u}/websites/pubstack.space/nodejs/builds` avec
   `source_type: "archive"`, `archive_path: "boutique.tar.gz"`, `app_type: "other"`,
   `output_directory: "."`.

Le site est ensuite servi en statique, sans processus Node.
