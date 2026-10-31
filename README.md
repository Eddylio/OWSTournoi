# SOLOQ SPRINT — version OP.GG sans clé Riot

Classement SoloQ EUW de 17 joueurs, conçu pour GitHub Pages. Le site présente les rangs et LP, un classement par progression, les parties suivies et les relevés hebdomadaires.

**Départ du défi : 31 octobre 2026 à 23:17 (Paris), soit 2026-10-31T22:17:00Z.** Les LP et rangs conservés dans `config/players.json` sont les références du défi. Certaines références sont approximatives, pas des archives garanties à la minute près. Les compteurs commencent à zéro, winrate « None ».

## À savoir AVANT de publier

- **Aucune clé Riot n'est nécessaire.** L'Action planifiée effectue au plus 17 lectures de **pages publiques** OP.GG, une fois par jour (vers 05:17 UTC). Elle **n'appuie pas sur « En mise à jour »** et ne contourne ni CAPTCHA, ni 403/429, ni protection antibot. Le site affiche l'heure du dernier relevé et conserve les dernières valeurs lisibles quand l'accès échoue.
- **Collecte expérimentale non validée sur le site réel** : l'environnement de préparation ne pouvait pas accéder aux fiches OP.GG. Le code et les tests fonctionnent sur des exemples de HTML, mais la structure actuelle d'OP.GG peut être différente ou ne pas exposer les données côté serveur. **Les mises à jour automatiques ne sont pas garanties.** Si 0/17 page est lisible, le workflow échoue sur la collecte tout en déployant les données précédentes.
- **Conditions OP.GG contradictoires** : le centre d'aide (31/12/2025) dit tolérer généralement le crawling avec attribution et faible charge (<https://help.op.gg/hc/en-us/articles/31091405109401-Can-I-use-OP-GG-data>), mais les conditions du 14/09/2026 interdisent le scraping et les scripts automatisés (<https://op.gg/fr/lol/policies/agreement>). Il incombe au propriétaire de vérifier l'autorisation d'OP.GG avant d'activer la collecte. Une demande d'autorisation à OP.GG est recommandée.
- **Les parties depuis le 31/10/2026 ne sont PAS récupérables rétrospectivement de manière exacte** uniquement à partir de la fiche publique : le collecteur prend comme référence les victoires/défaites saisonnières à la **première synchronisation réussie** puis additionne les différences des relevés ultérieurs. Les parties entre le 31 octobre 23:17 et cette première collecte ne sont donc pas prises en compte. Si un relevé ne contient pas les compteurs saisonniers, le suivi des parties n'est pas initialisé. Lors d'un reset de saison, une vérification manuelle est nécessaire.
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
- `state/opgg-state.json` : compteurs cumulés depuis premier relevé et dernières valeurs
- `.github/workflows/actualisation.yml` : une collecte quotidienne et déploiement Pages

### Limites connues

Il est impossible de promettre un suivi entièrement automatique et exact via OP.GG uniquement, sans accès garanti à des données fraîches et sans archive des parties au départ. Une première exécution en vrai sur GitHub Actions est nécessaire pour déterminer si la structure des fiches peut être lue. Si elle ne peut pas, le site continue à publier les valeurs précédentes, avec les liens OP.GG pour un contrôle manuel. N'augmentez pas la fréquence pour contourner une limitation.

SOLOQ SPRINT est indépendant, non affilié à Riot Games ni OP.GG. **Source des statistiques disponibles : OP.GG (https://op.gg).**
