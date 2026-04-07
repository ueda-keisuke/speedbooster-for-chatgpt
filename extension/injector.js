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

  const interceptorCode = `
(function () {
  'use strict';

  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

      // Only intercept GET requests for full conversation data
      if (!url.includes('/backend-api/conversation/')) return response;
      const method = (args[1]?.method || 'GET').toUpperCase();
      if (method !== 'GET') return response;

      // Don't intercept streaming endpoints or non-JSON
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return response;

      const limit = parseInt(document.documentElement.dataset.sbMessageLimit, 10) || 30;

      const clone = response.clone();
      const data = await clone.json();

      if (!data.mapping || !data.current_node) return response;

      const mapping = data.mapping;
      const keepIds = new Set();
      let nodeId = data.current_node;
      let messageCount = 0;

      // Walk backwards from current_node, keeping last N messages
      while (nodeId) {
        keepIds.add(nodeId);
        const node = mapping[nodeId];
        if (!node) break;
        if (node.message && node.message.content) messageCount++;
        if (messageCount >= limit * 2) {
          // Keep walking to root but stop counting
          // We need the full parent chain for tree integrity
          let rootId = node.parent;
          while (rootId) {
            keepIds.add(rootId);
            const rootNode = mapping[rootId];
            if (!rootNode) break;
            rootId = rootNode.parent;
          }
          break;
        }
        nodeId = node.parent;
      }

      // If we didn't trim anything, return original
      if (keepIds.size >= Object.keys(mapping).length) return response;

      // Build trimmed mapping
      const trimmed = {};
      for (const id of keepIds) {
        const node = mapping[id];
        trimmed[id] = {
          ...node,
          children: (node.children || []).filter((c) => keepIds.has(c)),
        };
      }

      data.mapping = trimmed;

      // Mark that trimming happened (content.js can detect this)
      document.documentElement.dataset.sbTrimmed = 'true';

      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (e) {
      // Any error: return original response untouched
      return response;
    }
  };

  // Signal that interceptor is active
  document.documentElement.dataset.sbInterceptorActive = 'true';
})();
`;

  try {
    const script = document.createElement('script');
    script.textContent = interceptorCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (e) {
    // CSP or other restriction blocked injection — content.js will handle everything
  }
})();
