# Synchro vidéo hommage

Deux choses déployées ensemble sur Vercel :

- `public/index.html` — la page de lecture synchronisée, servie à la racine du site.
- `api/time.js` — une seule route API publique en lecture seule, `/api/time`,
  qui retourne l'heure du serveur (`{"serverTime":1234567890123}`). Aucune base
  de données, aucune écriture, aucune donnée sensible.

La page et le service étant déployés ensemble, la page connaît son endpoint :
elle tape `/api/time` sur sa propre origine, sans rien à configurer.

## Arborescence

```
api/time.js          → route /api/time (fonction Node)
public/index.html    → page servie sur /
vercel.json          → en-têtes no-store + CORS sur /api/time
package.json         → "type": "module" (syntaxe ESM) + Node 22
```

Pas de build, pas de dépendances : Vercel détecte `public/` comme dossier
statique et `api/` comme fonctions, sans configuration supplémentaire.

## Déployer

Depuis ce dossier :

```bash
npm i -g vercel   # si pas déjà installé
vercel login
vercel --prod
```

Vercel te donne une URL du genre `https://sync-video-hommage-xxxx.vercel.app`.

Pour tester en local avant de déployer :

```bash
vercel dev   # puis http://localhost:3000 et http://localhost:3000/api/time
```

## Utiliser le soir même

Sur les deux ordinateurs, ouvre `https://sync-video-hommage-xxxx.vercel.app` :

1. Choisir le fichier vidéo sur la clé USB.
2. Mettre la **même** heure de départ sur les deux postes (ou un des boutons
   "Départ dans X min", qui utilisent déjà l'heure corrigée par le serveur).
3. "Préparer et attendre le départ" — la page se met en plein écran, affiche le
   décompte, et démarre la vidéo à la seconde prévue.

La page se synchronise avec le serveur dès son ouverture, puis une seconde fois
juste avant d'armer le décompte. Le statut de synchro est affiché en bas de
l'écran de réglage.

Le fichier vidéo reste local sur chaque PC — il n'est jamais envoyé nulle part.

## Tester l'API

```bash
curl https://sync-video-hommage-xxxx.vercel.app/api/time
```

Doit retourner quelque chose comme `{"serverTime":1234567890123}`.

## Si pas d'internet au salon

La synchro serveur est un bonus, jamais une dépendance. Si le service est
injoignable, la page repart automatiquement sur l'horloge locale des deux PC —
c'est le plan B natif, rien à faire de spécial.

Tu peux aussi copier `public/index.html` sur la clé USB et l'ouvrir directement
(`file://`) : la page détecte ce cas et passe en horloge locale. Si tu veux
quand même la synchro serveur depuis la clé, remplace la constante `SYNC_URL`
en haut du `<script>` par l'URL complète de ton déploiement (le CORS est ouvert
pour ça).
