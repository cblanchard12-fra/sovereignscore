# DEPLOIEMENT.md — Mettre SouverainScore en ligne, sans terminal

*Workflow : Windows + GitHub Desktop + interfaces web. Durée totale : 30-45 min la première fois. Aucune commande à taper : Vercel installe et compile dans le cloud à chaque push.*

**Prérequis de comptes** (tous gratuits au démarrage) :
- github.com — compte **personnel** (rappel : repo dédié au projet, distinct de tout repo professionnel)
- vercel.com — se connecter avec « Continue with GitHub »
- supabase.com — se connecter avec GitHub également (plus simple)

---

## Étape 1 — Le dépôt GitHub (via GitHub Desktop)

1. Dézipper `souverainscore-app.zip` dans un dossier de travail, par exemple `Documents\Projets\souverainscore`. Vérifier que `package.json` est **à la racine** du dossier (pas dans un sous-dossier intermédiaire créé par le dézippage — si c'est le cas, remonter les fichiers d'un niveau).
2. Ouvrir **GitHub Desktop** → menu `File` → `Add local repository…` → sélectionner le dossier. GitHub Desktop proposera « create a repository here instead » : accepter, laisser les options par défaut (le `.gitignore` est déjà fourni dans le zip).
3. En bas à gauche : premier commit — résumé « v0.1 — diagnostic gratuit » → bouton `Commit to main`.
4. Bouton `Publish repository` en haut → nom `souverainscore` → **cocher « Keep this code private »** → `Publish`.

Le code est sur GitHub. Vérification : github.com → votre profil → le repo apparaît.

## Étape 2 — La base Supabase

1. supabase.com → `New project` → organisation personnelle → nom `souverainscore` → **région : choisir une région UE, idéalement Paris (`eu-west-3`) si proposée** — cohérence oblige pour un produit de souveraineté. Noter le mot de passe base de données dans votre gestionnaire de mots de passe (il ne resservira pas tout de suite, mais il ne sera plus affiché).
2. Attendre ~2 min que le projet démarre.
3. Menu gauche → `SQL Editor` → `New query` → ouvrir le fichier `supabase/schema.sql` du projet avec le Bloc-notes, copier tout son contenu, coller, bouton `Run`. Résultat attendu : « Success. No rows returned ».
4. Menu gauche → `Table Editor` → la table `diagnostics` doit apparaître, vide. C'est là que vous consulterez les leads.
5. Récupérer les deux clés : menu `Settings` (roue crantée) → `API` →
   - **Project URL** (forme `https://xxxx.supabase.co`)
   - **anon public** key (longue chaîne commençant par `eyJ`)
   Les garder sous la main pour l'étape 3. La clé `anon` est **faite** pour être exposée dans un site public : la sécurité repose sur les policies RLS du schéma (le site ne peut qu'insérer, jamais lire). Ne jamais utiliser la clé `service_role` côté site.

## Étape 3 — Le déploiement Vercel

1. vercel.com → `Add New…` → `Project` → `Import Git Repository` → autoriser l'accès GitHub si demandé → choisir `souverainscore` → `Import`.
2. Vercel détecte automatiquement **Vite** (Framework Preset : Vite ; Build Command `npm run build` ; Output `dist`). Ne rien changer.
3. **Avant** de cliquer Deploy : dérouler `Environment Variables` et ajouter les deux variables :
   - `VITE_SUPABASE_URL` = la Project URL de l'étape 2
   - `VITE_SUPABASE_ANON_KEY` = la clé anon
4. `Deploy`. Compilation dans le cloud : ~1 min. À la fin, Vercel affiche l'URL publique du type `souverainscore-xxxx.vercel.app`.

## Étape 4 — Vérifier que tout fonctionne

1. Ouvrir l'URL Vercel → dérouler le diagnostic en entier avec de fausses réponses → remplir le formulaire (une vraie adresse à vous) → `Voir mes résultats`.
2. Supabase → `Table Editor` → `diagnostics` → une ligne doit être apparue avec l'organisation, l'email, le score, les réponses en JSON. Si oui : la chaîne complète fonctionne.
3. Si la ligne n'apparaît pas : Vercel → projet → onglet `Deployments` → dernier déploiement → vérifier que les variables d'environnement sont bien présentes (`Settings > Environment Variables`), puis `Redeploy` (les variables ne sont prises en compte qu'au build).

## Le cycle de travail au quotidien

1. Modifier les fichiers (moi, ou vous) → les enregistrer dans le dossier local.
2. GitHub Desktop montre les changements → message de commit court (« affine l'accroche », « corrige le scoring A4 ») → `Commit to main` → `Push origin`.
3. Vercel rebuilde et republie automatiquement. **Chaque push = mise en production en ~1 min.** L'historique GitHub permet de revenir en arrière à tout moment (clic droit sur un commit → Revert).

Conseil dès que le site aura du trafic réel : travailler sur une branche (`Branch > New branch` dans GitHub Desktop). Vercel crée alors une **URL de prévisualisation** par branche — vous validez avant de fusionner dans `main`, qui reste la production.

## Ce qui reste hors de ce guide (backlog)

- **Nom de domaine** : Vercel → projet → `Settings > Domains` quand le nom sera choisi et déposé (recherche d'antériorité INPI d'abord — prérequis n°4).
- **Envoi de la synthèse par email** : le formulaire promet un envoi ; non câblé en v0.1. Options v0.2 : Supabase Edge Function + Resend, ou export manuel hebdomadaire au début.
- **Purge RGPD** : définir la durée de conservation avec le juriste, puis l'automatiser (une requête SQL planifiée suffit).
- **Analytics de complétion** : Vercel Analytics (un clic dans le dashboard) donnera déjà les pages vues ; le tracking par étape du questionnaire viendra en v0.2.

## Rappels non négociables avant toute communication publique

1. Vérification du contrat de travail (exclusivité, PI, cumul) — **toujours non réglée** ; le site peut exister en ligne pour vos tests, mais pas de lancement commercial avant.
2. Mentions légales, politique de confidentialité, CGV : pages à ajouter et faire relire (le footer actuel porte le disclaimer méthodologique, pas les mentions légales obligatoires).
3. Recherche d'antériorité INPI sur « SouverainScore » avant d'acheter le domaine.
