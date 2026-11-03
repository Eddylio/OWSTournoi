# SOLOQ SPRINT — version OP.GG sans clé Riot

Classement SoloQ EUW de 17 joueurs, conçu pour GitHub Pages. Le site présente les rangs et LP, un classement par progression, les parties suivies et les relevés hebdomadaires.

**Départ du défi : 31 octobre 2026 à 23:17 (Paris), soit 2026-10-31T22:17:00Z.** Les LP et rangs conservés dans `config/players.json` sont les références du défi. Certaines références sont approximatives, pas des archives garanties à la minute près. Les compteurs commencent à zéro, winrate « None ».

## À savoir AVANT de publier

- **Aucune clé Riot n'est nécessaire.** L'Action planifiée effectue au plus 17 lectures de **pages publiques** OP.GG, une fois par jour (vers 05:17 UTC). Elle **n'appuie pas sur « En mise à jour »** et ne contourne ni CAPTCHA, ni 403/429, ni protection antibot. Le site affiche l'heure du dernier relevé et conserve les dernières valeurs lisibles quand l'accès échoue.
- **Collecte publique vérifiée** : lecture des 17 profils validée le 01/11/2026. La structure et la disponibilité d’OP.GG peuvent évoluer. Les anciennes valeurs sont conservées si la lecture échoue.
- **Conditions OP.GG contradictoires** : le centre d'aide (31/12/2025) dit tolérer généralement le crawling avec attribution et faible charge (<https://help.op.gg/hc/en-us/articles/31091405109401-Can-I-use-OP-GG-data>), mais les conditions du 14/09/2026 interdisent le scraping et les scripts automatisés (<https://op.gg/fr/lol/policies/agreement>). Il incombe au propriétaire de vérifier l'autorisation d'OP.GG avant d'activer la collecte. Une demande d'autorisation à OP.GG est recommandée.
- **Parties depuis le départ** : le collecteur lit les parties datées du JSON-LD public OP.GG et conserve leurs identifiants. Il compte uniquement les résultats WIN/LOSE en SOLORANKED dont le début est au moins le 31/10/2026 à 23h17 Paris. Les remakes et les autres modes sont exclus. Les collectes successives sont dédupliquées. Les pages peuvent ne montrer que les dix derniers matchs : les périodes couvertes sont suivies, et un trou d’historique est signalé comme partiel. Une fiche ancienne peut omettre des matchs récents ; la dernière partie disponible est affichée. Aucun total exhaustif n’est garanti au-delà de ce qu’OP.GG publie.
- **LP nets** : différence de rang/LP actuel par rapport au rang/LP de référence, après conversion (100 LP/division). Ce n'est pas un historique des LP gagnés/perdus après chaque match. Un reset de saison peut fausser cette mesure.

## Publier sur GitHub Pages

Le dépôt de publication est **`Eddylio/OWSTournoi`**.

1. Créer un **dépôt public vide** nommé **`soloq-sprint`** sur <https://github.com/new>, sans README, sans `.gitignore`, sans licence automatique.
2. Une fois le dépôt créé, l'assistant disposant de l'intégration GitHub pourra y publier les fichiers de ce dossier. Autre possibilité : envoyer les fichiers par Git (conserver le dossier caché `.github`) :

   ```sh
   git init -b main
   git add .
   git commit -m "SOLOQ Sprint — site sans clé Riot"
   git remote add origin https://github.com/Eddylio/OWSTournoi.git
   git push -u origin main
   ```
3. Aller dans **Settings → Pages → Build and deployment**, sélectionner **GitHub Actions** comme source. Le workflow `.github/workflows/actualisation.yml` contient la configuration de publication.
4. Aller dans **Actions → SOLOQ Sprint - OP.GG et publication → Run workflow**. La collecte démarre à chaque exécution quotidienne planifiée (ou manuelle), et le site est déployé même si OP.GG ne répond pas.
5. Le site sera sur <https://Eddylio.github.io/OWSTournoi/> **uniquement après un déploiement Pages réussi**. Ne pas présenter cette adresse comme active avant vérification.

GitHub peut suspendre la planification au bout de 60 jours sans activité sur un dépôt public. Vérifier l'onglet Actions en cas d'absence de mise à jour. Une publication publique de statistiques de joueurs doit respecter les conditions de Riot et OP.GG.

## Tests

Node 22 est recommandé :

```sh
node --test tests/*.test.mjs
```

Pour la prévisualisation locale, démarrer un serveur :

```sh
python -m http.server 8000 --directory public
```

Site : <http://localhost:8000>.

## Structure

- `public/index.html` et `public/assets/` : site responsive
- `public/data/latest.json` : dernière collecte ou références initiales
- `public/data/history.json` : progression hebdomadaire
- `config/players.json` : 17 comptes, lien OP.GG, rang et LP au départ
- `scripts/opgg-parser.mjs` : parseur prudent des données SoloQ (ne devine pas les LP)
- `scripts/sync-opgg.mjs` : lecteur public best-effort, fréquence faible, pas de clé
- `state/opgg-state.json` : registre des parties, périodes couvertes et derniers rangs
- `.github/workflows/actualisation.yml` : une collecte quotidienne et déploiement Pages

### Limites connues

Il est impossible de promettre un suivi entièrement automatique et exact via OP.GG uniquement, sans accès garanti à des données fraîches et sans archive des parties au départ. Une première exécution en vrai sur GitHub Actions est nécessaire pour déterminer si la structure des fiches peut être lue. Si elle ne peut pas, le site continue à publier les valeurs précédentes, avec les liens OP.GG pour un contrôle manuel. N'augmentez pas la fréquence pour contourner une limitation.

SOLOQ SPRINT est indépendant, non affilié à Riot Games ni OP.GG. **Source des statistiques disponibles : OP.GG (https://op.gg).**

## Top 3, forme et portraits des champions (sans clé Riot)

Le site affiche sur le **podium des 3 premiers** la forme des **trois dernières parties renseignées**, dans l'ordre **de la plus ancienne à la plus récente** : `V` pour victoire, `D` pour défaite. Sous les pseudos, jusqu'à **3 portraits de champions officiels** (Riot **Data Dragon**) apparaissent, classés par nombre de parties renseignées depuis le **31 octobre 2026 à 23h17 (Paris)**.

**Sans partie jouée : aucune icône.** Les résultats des parties SoloQ horodatées sont désormais transférés depuis le registre de matchs OP.GG déjà présent dans `state/opgg-state.json` vers `public/data/matches.json`, quotidiennement lors du workflow GitHub Actions, sans clé Riot. Un résultat V/D peut s'afficher même si le champion n'est pas connu. Un portrait n'apparaît que si le champion est explicitement présent et validé dans l'enregistrement OP.GG ou dans une entrée confirmée par l'organisateur. La collecte est expérimentale et peut échouer ; elle ne reconstitue pas les matchs absents des pages publiques, et ne force pas la mise à jour d'OP.GG. Le fichier `public/data/matches.json` conserve également les matchs ajoutés manuellement et validés.

Pour ajouter une partie, sur GitHub ouvre `public/data/matches.json`, puis « Edit this file » et insère une ligne dans `matches` :

```json
{
  "id": "EUW1_123456789",
  "playerId": "joueur-01",
  "playedAt": "2026-11-01T12:35:00Z",
  "queueId": 420,
  "champion": "Ahri",
  "result": "V"
}
```

Cet objet est **un exemple de format**, pas une partie réellement jouée ; il **n'est pas inclus** dans les données du site. Remplace chaque champ par les valeurs vérifiées. Utilise `joueur-01` à `joueur-17` tels qu'ils figurent dans `config/players.json`. `playedAt` est en ISO 8601 avec fuseau (`Z` pour UTC), `queueId` doit être `420` (Solo/Duo) et `champion` est l'identifiant Data Dragon anglais officiel (ex. `LeeSin`, `MissFortune`, `MonkeyKing`). Si plusieurs participants sont dans la même partie, chaque joueur a sa propre entrée avec le même `id` et un `playerId` différent. Les doublons d'un joueur sont ignorés, et les parties hors période ou hors SoloQ sont exclues.

Les nouvelles entrées sont visibles après le prochain déploiement GitHub Pages. Les portraits proviennent de `https://ddragon.leagueoflegends.com` (CDN officiel), sans clé. Les statistiques de champions peuvent être **partielles** si l'organisateur n'a pas ajouté toutes les parties. Le nombre de parties et le winrate du tableau principal continuent d'utiliser l'ancien suivi et ne sont **pas automatiquement déduits** de ce registre manuel.

### Automatisation de la forme (sans clé)

À chaque exécution de GitHub Actions, `scripts/export-opgg-matches.mjs` fusionne les résultats de matchs datés et identifiés issus de `state/opgg-state.json` avec les ajouts vérifiés dans `public/data/matches.json`. Les noms de champions non attestés restent absents. Les résultats anciens ne sont pas supprimés en cas d'échec du relevé.


## Prévisualisation privée via clé Riot personnelle

**Ne jamais utiliser une clé personnelle Riot pour alimenter le site GitHub Pages public.** Riot réserve la clé personnelle aux usages privés, groupes restreints et tests. Le site public conserve sa collecte OP.GG en attendant une clé de production.

Le script `scripts/riot-private-preview.mjs` permet de tester en local l'API Riot pour les 17 joueurs : rang/LP SoloQ, parties classées SoloQ depuis le 31/10/2026 à 23:17 (Paris), winrate, derniers V/D et champions joués. Il n'écrit qu'un fichier `.private/riot-preview.json` ignoré par Git ; aucune donnée issue de la clé personnelle n'est envoyée sur GitHub Pages. La requête limite volontairement à 100 matchs par joueur : si la limite est atteinte, `historyMayBeIncomplete` vaut `true` et les compteurs doivent être considérés comme partiels. Il exclut les remakes courts. Les taux de requêtes sont limités et le serveur peut renvoyer 429.

### Utilisation uniquement sur ton ordinateur (Node.js 22+)

1. En cas de clé copiée dans une conversation, **révoquer et régénérer la clé** dans le portail Riot.
2. Cloner ce dépôt, et créer dans son dossier racine un fichier `.env` (ignoré par Git) qui contient `RIOT_API_KEY=TA_NOUVELLE_CLE` sans les guillemets.
3. Lancer `node --env-file=.env scripts/riot-private-preview.mjs` depuis un terminal.
4. Ouvrir `.private/riot-preview.json` localement pour consulter les données. Ne pas commiter ce fichier et ne pas le placer dans `public/`.

Pour la version publique, demander une clé **Production** à Riot, puis configurer les secrets du serveur ou de GitHub Actions selon la politique de Riot. Ne jamais placer la clé dans le navigateur, dans un commit ou dans le chat.
