// page-interceptor.js — Runs in the page context and trims conversation fetches.

(function () {
  'use strict';

  const originalFetch = window.fetch;

  function isCountableMessage(node) {
    const message = node?.message;
    if (!message || !message.content) return false;
    if (message.author?.role === 'system') return false;
    if (message.metadata?.is_visually_hidden_from_conversation) return false;
    return true;
  }

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

      if (!url.includes('/backend-api/conversation/')) return response;

      const method = (args[1]?.method || 'GET').toUpperCase();
      if (method !== 'GET') return response;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return response;

      const limit = parseInt(document.documentElement.dataset.sbMessageLimit, 10) || 30;

      const clone = response.clone();
      const data = await clone.json();

      if (!data.mapping || !data.current_node) return response;

      const mapping = data.mapping;
      const keepIds = new Set();
      let nodeId = data.current_node;
      let visibleMessageCount = 0;
      let cutoffNodeId = null;

      while (nodeId) {
        keepIds.add(nodeId);
        const node = mapping[nodeId];
        if (!node) break;

        if (isCountableMessage(node)) {
          visibleMessageCount++;
        }

        if (visibleMessageCount >= limit * 2) {
          cutoffNodeId = nodeId;
          break;
        }

        nodeId = node.parent;
      }

      if (!cutoffNodeId) return response;

      const cutoffNode = mapping[cutoffNodeId];
      const cutoffParentId = cutoffNode?.parent || null;

      if (keepIds.size >= Object.keys(mapping).length) return response;

      const trimmed = {};
      for (const id of keepIds) {
        const node = mapping[id];
        if (!node) continue;

        trimmed[id] = {
          ...node,
          children: (node.children || []).filter((childId) => keepIds.has(childId)),
        };
      }

      if (cutoffParentId && trimmed[cutoffNodeId]) {
        trimmed[cutoffNodeId] = {
          ...trimmed[cutoffNodeId],
          parent: null,
        };
      }

      data.mapping = trimmed;
      document.documentElement.dataset.sbTrimmed = 'true';
      document.documentElement.dataset.sbTrimmedCount = String(keepIds.size);

      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (e) {
      return response;
    }
  };

  document.documentElement.dataset.sbInterceptorActive = 'true';
})();
