# 🛍️ Tawes Store

Une plateforme e-commerce moderne construite avec React, Vite, et Supabase.

## 🚀 Démarrage Rapide

### Prérequis

- Node.js v22.x ou supérieur
- pnpm v10.x
- Compte Supabase

### Installation Locale

1. **Cloner le projet**
   ```bash
   git clone https://github.com/votre-username/Tawesstorev1.git
   cd Tawesstorev1
   ```

2. **Installer les dépendances**
   ```bash
   pnpm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   ```
   
   Puis modifiez `.env` avec vos credentials Supabase.

4. **Démarrer en mode développement**
   ```bash
   pnpm dev
   ```
   
   L'application sera accessible sur `http://localhost:5173`

## 📦 Structure du Projet

```
Tawesstorev1/
├── artifacts/
│   ├── api-server/         # API Express backend
│   ├── mockup-sandbox/     # Sandbox pour mockups UI
│   └── tawes-store/        # Application principale (frontend)
├── lib/
│   ├── api-client-react/   # Client API React
│   ├── api-spec/           # Spécifications API OpenAPI
│   ├── api-zod/            # Schémas de validation Zod
│   └── db/                 # Configuration base de données
├── .env.example            # Template variables d'environnement
├── DEPLOY.md               # Guide de déploiement
└── package.json            # Configuration workspace
```

## 🛠️ Stack Technique

- **Frontend**: React 19, Vite 7, TailwindCSS 4
- **Backend**: Express 5, Node.js 24
- **Base de données**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **UI Components**: Radix UI, Shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter

## 📝 Scripts Disponibles

```bash
# Développement
pnpm dev                    # Démarrer en mode développement

# Build
pnpm build                  # Build tous les packages
pnpm build:prod             # Build pour production

# Démarrage
pnpm start                  # Démarrer l'application buildée

# Type checking
pnpm typecheck              # Vérifier les types TypeScript
```

## 🌐 Déploiement

Pour déployer sur Hostinger, consultez le guide détaillé : [DEPLOY.md](./DEPLOY.md)

### Résumé du déploiement :

1. Pousser le code sur GitHub
2. Connecter le dépôt à Hostinger
3. Configurer les variables d'environnement
4. Laisser Hostinger build et déployer automatiquement

## 🔧 Configuration

### Variables d'environnement requises

Voir `.env.example` pour la liste complète.

**Essentielles** :
- `SUPABASE_URL` - URL de votre projet Supabase
- `SUPABASE_ANON_KEY` - Clé anonyme Supabase
- `PORT` - Port de l'application (défaut: 5173)
- `BASE_PATH` - Chemin de base (défaut: /)
- `NODE_ENV` - Environnement (development/production)

### Configuration Supabase

1. Créez un projet sur [Supabase](https://supabase.com)
2. Créez les tables nécessaires pour les produits
3. Copiez les credentials dans `.env`

## 🐛 Dépannage

### L'application ne démarre pas
- Vérifiez que Node.js v22+ est installé
- Vérifiez que pnpm est installé globalement
- Supprimez `node_modules` et réinstallez : `pnpm install --force`

### Les produits ne s'affichent pas
- Vérifiez les credentials Supabase dans `.env`
- Vérifiez que les tables Supabase sont créées
- Consultez la console du navigateur pour les erreurs

### Erreurs de build
- Exécutez `pnpm typecheck` pour voir les erreurs TypeScript
- Vérifiez que toutes les dépendances sont installées
- Assurez-vous d'utiliser la bonne version de Node.js

## 📱 Fonctionnalités

- ✅ Catalogue de produits avec images
- ✅ Filtrage par catégories
- ✅ Recherche de produits
- ✅ Prix de détail et grossiste
- ✅ Gestion du stock
- ✅ Interface responsive
- ✅ Mode sombre/clair
- ✅ Connexion Supabase
- 🚧 Panier d'achat (à venir)
- 🚧 Processus de commande (à venir)
- 🚧 Authentification utilisateur (à venir)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou un pull request.

## 📄 Licence

MIT

## 📞 Support

Pour toute question ou support :
- Ouvrez une issue sur GitHub
- Consultez la documentation dans `/docs`
- Référez-vous à `DEPLOY.md` pour les problèmes de déploiement

---

Fait avec ❤️ pour Tawes Store
