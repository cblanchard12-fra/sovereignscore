# SouverainScore — diagnostic gratuit (v0.1)

Plateforme d'audit de souveraineté numérique. Ce dépôt contient le diagnostic
gratuit : 16 questions, score /100, radar 8 axes, alerte critique détaillée.

Projet personnel — créé de zéro, hors de tout cadre professionnel.

## Stack
React 18 + Vite 5 · Supabase (stockage des diagnostics) · Vercel (hébergement, build cloud)

## Déploiement (sans terminal)
Voir le guide `DEPLOIEMENT.md` : GitHub Desktop → Vercel → Supabase, étape par étape.

Aucune commande locale n'est nécessaire : Vercel installe les dépendances et
compile à chaque push sur GitHub.

## Variables d'environnement (à configurer dans Vercel)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Sans ces variables, l'app fonctionne en mode prototype (rien n'est enregistré).

## Contenu éditorial
Questions, pondérations et blocs de préconisation sont pour l'instant codés en
dur dans `src/App.jsx` (conforme au backlog v0.1). Ils seront synchronisés
depuis Airtable en v0.5.
