// injector.js — Runs at document_start to inject fetch interceptor into page world.
// If injection fails (CSP, Safari restrictions), content.js handles everything via DOM.

(function () {
  'use strict';

  const MESSAGE_LIMIT = 30;

  // Store the limit on documentElement so the interceptor can read it
  document.documentElement.dataset.sbMessageLimit = MESSAGE_LIMIT;

  // Also listen for updates from content.js
  window.addEventListener('sb-update-limit', (e) => {
    document.documentElement.dataset.sbMessageLimit = e.detail.limit;
  });

  try {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('page-interceptor.js');
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
    script.addEventListener('load', () => script.remove(), { once: true });
    script.addEventListener('error', () => script.remove(), { once: true });
  } catch (e) {
    // CSP or other restriction blocked injection — content.js will handle everything
  }
})();
