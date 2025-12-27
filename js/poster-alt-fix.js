/**
 * Ensures every lite-youtube poster keeps its descriptive alt text.
 * Some optimizers/bots occasionally strip it, which triggers SEO warnings.
 */
(function () {
  function restorePosterAlt() {
    var blocks = document.querySelectorAll('.lite-youtube');
    if (!blocks.length) return;

    blocks.forEach(function (block) {
      var expectedAlt = block.getAttribute('data-poster-alt');
      if (!expectedAlt) return;

      var posterImg = block.querySelector('.lite-youtube__poster img');
      if (!posterImg) return;

      var currentAlt = posterImg.getAttribute('alt') || '';
      if (currentAlt.trim() === '') {
        posterImg.setAttribute('alt', expectedAlt);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restorePosterAlt, { once: true });
  } else {
    restorePosterAlt();
  }
})();
