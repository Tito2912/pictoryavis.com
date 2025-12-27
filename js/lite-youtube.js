// Lightweight YouTube embed loader.
// Keeps the heavy iframe off the main thread until the visitor interacts.
(function () {
  'use strict';

  var CONNECTIONS_WARMED = false;

  function warmConnections() {
    if (CONNECTIONS_WARMED) return;
    CONNECTIONS_WARMED = true;
    var origins = [
      'https://www.youtube.com',
      'https://s.ytimg.com',
      'https://i.ytimg.com'
    ];
    origins.forEach(function (href) {
      var link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  function buildIframe(el) {
    var videoId = el.getAttribute('data-video-id');
    if (!videoId) return;

    var params = el.getAttribute('data-params') || 'modestbranding=1&rel=0';
    var title = el.getAttribute('data-title') || 'YouTube video';
    if (params.indexOf('autoplay=') === -1) {
      params += (params ? '&' : '') + 'autoplay=1';
    }

    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + videoId + '?' + params;
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('allowfullscreen', 'allowfullscreen');
    iframe.setAttribute('title', title);
    iframe.setAttribute('loading', 'lazy');
    el.innerHTML = '';
    el.appendChild(iframe);
    el.classList.add('lite-youtube--activated');
  }

  function setupLiteEmbed(liteEl) {
    var trigger = liteEl.querySelector('.lite-youtube__button');
    if (!trigger) return;

    function activate() {
      if (liteEl.classList.contains('lite-youtube--activated')) return;
      warmConnections();
      buildIframe(liteEl);
    }

    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      activate();
    });

    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });

    var pointerWarm = function () { warmConnections(); trigger.removeEventListener('pointerover', pointerWarm); };
    trigger.addEventListener('pointerover', pointerWarm, { once: true });
    trigger.addEventListener('focus', warmConnections, { once: true });
  }

  function init() {
    var liteEmbeds = document.querySelectorAll('.lite-youtube');
    if (!liteEmbeds.length) return;
    liteEmbeds.forEach(setupLiteEmbed);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
