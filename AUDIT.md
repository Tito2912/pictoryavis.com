# Audit complet — pictoryavis.com

Date de l’audit : 2026-04-08  
Périmètre : contenu + SEO + technique (site statique Netlify, multipages, FR/EN (+ DE/ES)).  
Sources analysées : code du repo, headers/HTTP en production via `curl`, exports Ahrefs présents dans `.ahrefs_report_2026-01-17`.

## 1) Résumé exécutif (priorités)

### Priorité P0 (impact SEO/risque le plus élevé)
- **Données structurées à risque** : la home déclare un `aggregateRating` (4.8 / 1243) et un prix (`Offer price=19 USD`) **sans preuve visible sur la page** → risque de **non‑éligibilité**, d’alertes dans GSC, voire d’actions manuelles “structured data spam” si perçu comme trompeur.
- **Pages DE/ES “semi‑publiées”** : présentes en `hreflang`, indexables, mais **qualité de traduction faible** (titres EN, “Silencio”, encodage `&amp;gt;`, bouts d’anglais). À trancher : **les assumer** (réécriture) ou **les retirer de l’index** (noindex + retirer du hreflang).
- **Hub blog en `noindex`** alors qu’il sert de page catégorie/hub et figure dans le sitemap → incohérence + perte d’une landing page interne utile.

### Priorité P1 (gains SEO/UX importants)
- **Redirect chain `http://www → https://www → https://apex`** constatée (Ahrefs + vérif live). À corriger côté Netlify (souvent via désactivation “Force HTTPS” et/ou règle dédiée).
- **Liens d’affiliation** : `rel="sponsored"`/`nofollow` manquant sur la majorité des liens vers `pictory.ai?ref=...` (et un autre domaine) → best practice SEO.
- **Cookie banner** affiché uniquement sur les pages `index.html` (FR/EN/DE/ES) : les visiteurs qui atterrissent sur un article ne voient pas l’option de consentement (analytics non chargé, mais UX/compliance perfectible).

### Priorité P2 (qualité, maintenabilité, performance perçue)
- **Cache 1 an sur `/CSS/*` et `/js/*`** avec URLs non fingerprintées (ex: `CSS/style.min.css`) : risque de **ressources “bloquées” en cache** chez les visiteurs récurrents lors d’une future mise à jour.
- **Icônes Font Awesome** utilisées dans le HTML (`<i class="fas ...">`) sans chargement évident de Font Awesome → possible affichage manquant (à confirmer visuellement).
- **Meta OG dimensions** incohérentes sur la home (`og:image:width/height` ne correspond pas à l’image réellement servie).

## 2) Inventaire rapide

- Pages FR : `/`, `/blog`, `/blog-1..4`, `/mentions-legales`, `/politique-de-confidentialite`
- Pages EN : `/en/`, `/en/blog`, `/en/blog-1..4`, `/en/legal-notice`, `/en/privacy-policy`
- Pages DE/ES : mêmes slugs sous `/de/` et `/es/`
- Sitemap : `sitemap.xml` liste désormais FR+EN+DE+ES (avec alternates via `xhtml:link`).

## 3) Points forts (déjà bien)

- **Site statique léger** : CSS ~21KB, JS minimal, images en WebP + `preload` + `defer`.
- **Headers de sécurité** globalement solides (HSTS, CSP, nosniff, frame options…).
- **SEO de base propre** : `canonical`, `hreflang`, OpenGraph/Twitter, `robots.txt` + `sitemap.xml`.
- **IndexNow/Bing** : présence d’une clé et plugins Netlify (soumission sitemap).

## 4) Audit technique

### 4.1 Redirects, canonicals, URLs “propres”
- FR/EN : patterns “URL propre” gérés (ex: `/blog.html → /blog`).
- **DE/ES : duplication actuelle en prod** : `/de/page` ET `/de/page.html` répondent 200 (idem ES). Canonical pointe vers l’URL propre, mais idéalement il faut **301**.
- **Correctif préparé dans le repo** : j’ai ajouté dans `netlify.toml` des règles DE/ES pour :
  - réécrire `/de/page → /de/page.html` en 200
  - rediriger `/de/page.html → /de/page` en 301
  - idem pour ES
  - + headers `Content-Language` pour `/de/*` et `/es/*`

### 4.2 Redirect chain http/www
Constat (Ahrefs 2026‑01‑17 + vérif le 2026‑04‑08) :
- `http://pictoryavis.com/` → 301 → `https://pictoryavis.com/` (ok)
- `http://www.pictoryavis.com/` → 301 → `https://www.pictoryavis.com/` → 301 → `https://pictoryavis.com/` (chaîne)

Recommandation :
- Objectif : **1 seul saut** vers `https://pictoryavis.com/...`.
- Sur Netlify, cela implique souvent de **désactiver “Force HTTPS”** (si activé) et de laisser les règles `netlify.toml` faire la normalisation.

### 4.3 Cache statique (risque de “stale assets”)
`netlify.toml` définit (actuel) :
- `/CSS/*` et `/js/*` : `max-age=31536000, immutable`
- Or les assets **ne sont pas versionnés** (pas de hash dans le nom, pas de querystring).

Recommandations (choisir 1 approche) :
1) **Versionner les assets** (ex: `style.min.css?v=2026-04-08`) et garder le cache long, ou
2) Baisser le TTL CSS/JS (ex: 1 jour / 7 jours) et retirer `immutable`.

### 4.4 Consentement cookies / analytics
- Consent Mode v2 : bon réflexe (default denied + chargement conditionnel GA).
- Mais le **banner n’existe que sur les pages d’accueil** : à étendre à toutes les pages si vous souhaitez un choix explicite partout.

### 4.5 Performance (signal)
Ahrefs “Slow pages” (2026‑01‑17) montre surtout un **TTFB ~1.0–1.2s** sur des pages HTML légères :
- `https://pictoryavis.com/en/blog-1` ~1228ms
- `https://pictoryavis.com/` ~1187ms

À vérifier via PageSpeed Insights (réseau réel, Core Web Vitals). Sur Netlify, ce TTFB est souvent lié au POP/cold cache.

## 5) Audit SEO (indexation, structure, données)

### 5.1 Indexation & sitemap
- Le sitemap liste `/blog` et `/en/blog`, mais ces pages ont `meta robots="noindex, follow"`.
- Recommandation : **indexer les hubs** (sauf stratégie volontaire “only money pages”).

### 5.2 Hreflang / international
Actuel :
- FR/EN sont cohérents et ciblés.
- DE/ES : présents partout en alternates, mais **pas accessibles via le sélecteur** et qualité de traduction inégale.

Décision stratégique recommandée :
- **Option A (pragmatique)** : garder uniquement FR/EN → mettre DE/ES en `noindex` + retirer `hreflang` DE/ES.
- **Option B (croissance)** : assumer DE/ES → réécrire les titres/meta/contenu, ajouter navigation, et idéalement ajouter DE/ES au sitemap (ou au moins améliorer l’interlinking).

### 5.3 Données structurées (Schema.org)
Constats :
- Home : `SoftwareApplication` + `offers` + `aggregateRating` **sans équivalent visible** (et prix potentiellement non à jour).
- Blog pages : `WebSite` inclut `SearchAction` vers `https://pictoryavis.com/search?q={query}` mais **aucune page `/search`** n’existe.

Recommandations :
- Supprimer `SearchAction` tant que la recherche n’existe pas.
- Retirer ou refondre le bloc `aggregateRating`/`offers` : n’utiliser que des données **vérifiables et affichées** (ou basculer vers un schéma “Review” éditorial correctement présenté).

### 5.4 Liens d’affiliation
- Les liens sortants vers Pictory utilisent surtout `rel="noopener noreferrer"`.
- Recommandation : ajouter `rel="sponsored"` (ou `nofollow sponsored`) sur les liens d’affiliation.

## 6) Audit contenu / UX / conversion

### 6.1 Crédibilité (E‑E‑A‑T)
À améliorer :
- Ajouter une page **À propos** (qui écrit, expérience, méthode, sources).
- Sur la home : “Ce que nos clients disent” + badge “Client vérifié” + étoiles **sans source** → à remplacer par :
  - citations sourcées (lien vers la page Trustpilot/Capterra/Feefo + date), ou
  - retours d’expérience internes clairement présentés comme tels, sans “vérifié”.

### 6.2 Fraîcheur (contenu “année”)
- Plusieurs pages titrées “2025” (comparatif/tendances/feature timeline). En 2026‑04, cela donne un signal “pas à jour”.
- Recommandation : passer en “2026” + mettre à jour le contenu + refléter `lastmod` dans le sitemap.

### 6.3 Couverture éditoriale (suggestion)
Pour renforcer le positionnement “avis + usage”, ajouter 6–12 pages ciblées :
- “Tarifs Pictory (2026) : plans, limites, coût par minute”
- “Pictory alternatives” (InVideo, Lumen5, VEED, CapCut, Descript…)
- “Workflow : article → YouTube + Shorts” (avec checklists)
- “Sous‑titres : accessibilité + exports” (étendre blog‑4)
- “Templates & prompts” (scripts, hooks, structure de vidéo)

## 7) Actions recommandées (roadmap)

### Semaine 1 (quick wins)
- Décider DE/ES (Option A ou B) et aligner `hreflang`/robots/sitemap.
- Corriger données structurées (SearchAction + rating/price).
- Indexer les pages hub blog si souhaité.
- Corriger redirect chain http/www.

### Mois 1
- Refonte “preuves & confiance” (témoignages sourcés, méthode, about).
- Mise à jour des contenus “2025 → 2026”.
- Ajouter `rel="sponsored"` sur les liens affiliés.

### Trimestre
- Industrialiser la génération des pages (SSG/templating) pour éviter les divergences (cookie banner, SEO tags, hreflang…).
- Plan éditorial + maillage interne (clusters).

---

Si tu veux, je peux maintenant :
1) appliquer les correctifs SEO “sans débat” (SearchAction, `rel="sponsored"`, OG dimensions) dans le HTML, ou  
2) te proposer 2 scénarios DE/ES (garder vs retirer) avec patchs prêts à déployer.

## 8) Patch SEO appliqué (repo)

Changements effectués le 2026-04-08 :
- Suppression de `SearchAction` (pas de page `/search`).
- Suppression `offers` + `aggregateRating` du schema `SoftwareApplication` (home).
- Ajout de `rel=\"sponsored\"` sur les liens d’affiliation (`pictory.ai?ref=...` + `videocaptionstudio.com`).
- Hubs `/blog` et `/en/blog` passés en `index, follow`.
- Option B : DE/ES conservés → `hreflang` + `sitemap.xml` rétablis, pages DE/ES indexables (hors légal/confidentialité) et contenus DE/ES réécrits (titres, metas, navigation, CTA, tableaux, textes).
