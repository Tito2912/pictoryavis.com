// /js/lang-redirect.js — Redirection FR→EN pour visiteurs non-francophones (1ère visite uniquement)
(function () {
  // --- Helpers stockage (LS → cookie fallback) ---
  const KEY = 'lang_redirect_done';
  const CK = 'lr=1';

  function getMarker() {
    try { if (localStorage.getItem(KEY) === '1') return true; } catch(e){}
    return document.cookie.indexOf('lr=1') !== -1;
  }
  function setMarker() {
    try { localStorage.setItem(KEY, '1'); } catch(e){}
    // cookie 1 an
    document.cookie = 'lr=1; Max-Age=31536000; Path=/';
  }

  try {
    // 0) Respecter un choix manuel précédent (depuis le sélecteur de langue)
    if (getMarker()) return;

    // 1) Ne JAMAIS rediriger les robots (SEO safety)
    var ua = (navigator.userAgent || '').toLowerCase();
    var bot = /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|facebot|ia_archiver|semrush|siteauditbot|ahrefs|mj12bot|seznambot)/i.test(ua);
    if (bot) return;

    // 2) Détection langue navigateur (liste + valeur unique)
    var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || navigator.userLanguage || ''])
      .map(function(l){ return (l || '').toLowerCase(); });
    var isFrench = langs.some(function(l){ return l.startsWith('fr'); });

    // 3) Mapping FR → EN (évite /en/index.html pour ne pas doubler la redirection côté Netlify)
    var englishPages = {
      '/': '/en/',
      '/index.html': '/en/',
      '/blog': '/en/blog',
      '/blog.html': '/en/blog',
      '/blog-1': '/en/blog-1',
      '/blog-1.html': '/en/blog-1',
      '/blog-2': '/en/blog-2',
      '/blog-2.html': '/en/blog-2',
      '/blog-3': '/en/blog-3',
      '/blog-3.html': '/en/blog-3',
      '/mentions-legales': '/en/legal-notice',
      '/mentions-legales.html': '/en/legal-notice',
      '/politique-de-confidentialite': '/en/privacy-policy',
      '/politique-de-confidentialite.html': '/en/privacy-policy'
    };

    // 4) Si pas francophone, rediriger uniquement depuis les pages FR ayant un équivalent EN
    if (!isFrench) {
      var path = window.location.pathname;
      var target = englishPages[path];
      if (target) {
        // préserver query + hash
        var dest = target + (window.location.search || '') + (window.location.hash || '');
        // marquer (évite futures redirections) AVANT de partir
        setMarker();
        window.location.replace(dest);
        return;
      }
    }

    // 5) Marqueur même si aucune redirection (évite de re-tester à chaque page)
    setMarker();
  } catch (e) {
    // En cas d'erreur, ne rien casser.
    // Optionnel : console.debug('Lang redirect error:', e);
  }
})();
