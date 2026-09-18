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

## Recalage pendant la lecture

Démarrer les deux PC à la même seconde ne suffit pas : les deux machines ne
décodent pas exactement au même rythme, et un tour de boucle fige l'écart accumulé
au lieu de le rattraper. La page ne suppose donc jamais que « ça suit » — elle
recalcule en continu la position due :

```
position attendue = (heure corrigée − heure de départ) modulo durée de la vidéo
```

**Un saut en pleine image se voit ; à la frontière de boucle, l'image change de
toute façon.** Le recalage dur est donc réservé au rebouclage :

| Situation | Action |
|---|---|
| Écart < 40 ms (~1 image) | rien |
| Écart en cours de plan | vitesse à 0,98 ou 1,02 — rattrapage progressif, **aucun saut** |
| Écart au rebouclage | saut à la position due, invisible puisque l'image change |
| Écart > 2 s (PC qui a décroché) | saut immédiat : attendre la boucle laisserait des minutes de désynchro visible |

La page sonde toutes les 250 ms, mais c'est pour **détecter le rebouclage dans les
premières images du tour suivant**, pas pour corriger plus souvent. En marche
normale elle ne fait rien.

Trois réglages en haut du `<script>` de [`public/index.html`](public/index.html) :

- `DRIFT_OK_MS` (40) — la zone morte.
- `NUDGE_RATE` (0.02) — le rattrapage doux. **Mets-le à `0`** pour un recalage
  strictement au rebouclage, sans jamais toucher à la vitesse.
- `DRIFT_PANIC_MS` (2000) — le décrochage franc. **Mets-le à `Infinity`** pour
  n'autoriser aucun saut ailleurs qu'à la boucle.

### À savoir sur la précision

La zone morte s'applique à chaque PC séparément : chacun se cale à ±40 ms de
l'heure, donc l'écart **entre les deux** peut atteindre 80 ms. C'est invisible à
l'œil (2 images), mais si les deux PC sortent du son dans la même pièce, 80 ms
s'entend comme un écho. Dans ce cas : coupe le son d'un des deux, ou descends
`DRIFT_OK_MS` à 15.

Le calcul de l'écart est circulaire, donc la frontière de boucle (fin → début)
n'est pas lue comme un écart d'une durée entière de vidéo. Comme la référence est
l'heure et non « le temps écoulé depuis le démarrage », le nombre de tours déjà
passés n'a aucune importance : les deux PC visent toujours la même image du même
tour.

Deux autres conséquences utiles :

- Le décalage de démarrage est absorbé. Le décompte tourne à 250 ms et `play()`
  a sa propre latence ; plutôt que de partir de 0 avec ce retard figé, la page se
  place d'emblée à la position due.
- L'horloge du PC est re-synchronisée sur le serveur chaque minute pendant la
  lecture. Un échec réseau est sans conséquence : le dernier décalage connu reste
  en place, jamais de retour brutal à zéro. Une mesure nettement plus lente que
  les précédentes (coup de wifi mou) est refusée, pour que l'horloge ne bouge pas
  en pleine lecture sur une mauvaise mesure.
- **Un PC qui plante peut rejoindre.** Relance la page, rechoisis le fichier,
  remets la même heure de départ — même si elle est passée depuis 20 minutes. La
  page comprend que la lecture est en cours et se place directement à la bonne
  image. (Une heure passée de plus de 12 h est lue comme « demain ».)
- L'écran ne s'éteint pas pendant le décompte : la page demande un verrou d'écran
  au moment de « Préparer ». Ça exige HTTPS, donc l'URL Vercel ; en `file://`
  depuis la clé, règle la mise en veille de Windows à la main.

**Vérifier sur place :** appuie sur la touche `d` pendant la lecture. Un petit
indicateur affiche l'écart mesuré, la vitesse appliquée et le décalage serveur.
Sur les deux PC, l'écart doit osciller autour de zéro à quelques dizaines de ms.

## Tester l'API

```bash
curl https://sync-video-hommage-xxxx.vercel.app/api/time
```

Doit retourner quelque chose comme `{"serverTime":1234567890123}`.

## Checklist avant le soir

Ce que la page ne peut pas vérifier à ta place :

- **Le même fichier sur les deux PC.** Le recalage suppose la même durée. Deux
  exports différents du montage = deux durées = deux vidéos qui ne resteront pas
  alignées. Compare la durée affichée sous « Fichier choisi ».
- **Copie le fichier sur le disque du PC** plutôt que de le lire depuis la clé.
  Une clé lente peut faire décrocher la lecture ; le recalage rattrape, mais par
  un saut.
- **Même fuseau horaire sur les deux PC.** L'heure de départ est saisie en heure
  locale ; un PC en heure de Montréal et l'autre en UTC ne visent pas le même
  instant.
- **Utilise l'URL de production** (`vercel --prod`), pas une URL de preview :
  les previews Vercel demandent une connexion et la page ne se chargerait pas.
- **Fais un vrai test complet la veille**, avec les deux PC et le vrai fichier :
  départ dans 3 min, laisse tourner deux tours de boucle, touche `d` pour lire
  l'écart sur chacun. C'est le seul test qui vaut.
- Si le message « durée inconnue » ou « ce navigateur ne sait pas lire ce
  fichier » apparaît sous le nom du fichier, réexporte en MP4 H.264/AAC : c'est le
  format que tous les navigateurs lisent et dont ils connaissent la durée.

## Si pas d'internet au salon

La synchro serveur est un bonus, jamais une dépendance. Si le service est
injoignable, la page repart automatiquement sur l'horloge locale des deux PC —
c'est le plan B natif, rien à faire de spécial.

Tu peux aussi copier `public/index.html` sur la clé USB et l'ouvrir directement
(`file://`) : la page détecte ce cas et passe en horloge locale. Si tu veux
quand même la synchro serveur depuis la clé, remplace la constante `SYNC_URL`
en haut du `<script>` par l'URL complète de ton déploiement (le CORS est ouvert
pour ça).
