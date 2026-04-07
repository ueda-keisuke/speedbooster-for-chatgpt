// content.js — Core DOM windowing logic for ChatGPT speed boost
// Injected on chatgpt.com. Depends on selectors.js (loaded before this file).

(function () {
  'use strict';

  // --- State ---
  const state = {
    enabled: true,
    messageLimit: 30,
    loadMoreBatch: 20,
    visibleCount: 30,
    totalCount: 0,
    observer: null,
    urlObserver: null,
    lastUrl: location.href,
  };

  // --- Freemium gate (always true for now) ---
  function isFeatureEnabled(feature) {
    return true;
  }

  // --- Load settings from storage ---
  async function loadSettings() {
    try {
      const data = await browser.storage.local.get(['enabled', 'messageLimit']);
      if (data.enabled !== undefined) state.enabled = data.enabled;
      if (data.messageLimit !== undefined) state.messageLimit = data.messageLimit;
      state.visibleCount = state.messageLimit;
    } catch (e) {
      // Storage not available, use defaults
    }
  }

  // --- Listen for settings changes ---
  function listenForSettingsChanges() {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes.enabled !== undefined) {
        state.enabled = changes.enabled.newValue;
        if (state.enabled) {
          applyWindowing();
        } else {
          showAllMessages();
        }
      }
      if (changes.messageLimit !== undefined) {
        state.messageLimit = changes.messageLimit.newValue;
        state.visibleCount = state.messageLimit;
        applyWindowing();
      }
    });
  }

  // --- Core: apply windowing to messages ---
  function applyWindowing() {
    if (!state.enabled) return;

    const turns = queryMessageTurns();
    state.totalCount = turns.length;

    if (turns.length === 0) return;

    const hideCount = Math.max(0, turns.length - state.visibleCount);

    turns.forEach((turn, i) => {
      if (i < hideCount) {
        turn.style.display = 'none';
        turn.dataset.sbHidden = 'true';
      } else {
        turn.style.display = '';
        delete turn.dataset.sbHidden;
      }
    });

    updateLoadMoreButton(hideCount > 0);
    broadcastStats();
  }

  // --- Show all messages (when disabled) ---
  function showAllMessages() {
    const turns = queryMessageTurns();
    turns.forEach((turn) => {
      turn.style.display = '';
      delete turn.dataset.sbHidden;
    });
    removeLoadMoreButton();
    broadcastStats();
  }

  // --- Load More button ---
  function updateLoadMoreButton(shouldShow) {
    let btn = document.getElementById('sb-load-more-btn');

    if (!shouldShow) {
      if (btn) btn.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'sb-load-more-btn';
      btn.textContent = 'Load More Messages';
      btn.style.cssText = [
        'display: block',
        'margin: 12px auto',
        'padding: 8px 20px',
        'border: 1px solid rgba(255,255,255,0.2)',
        'border-radius: 8px',
        'background: rgba(255,255,255,0.05)',
        'color: #b4b4b4',
        'cursor: pointer',
        'font-size: 13px',
        'transition: background 0.15s',
      ].join(';');
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,255,255,0.1)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(255,255,255,0.05)';
      });
      btn.addEventListener('click', onLoadMore);

      const area = queryConversationArea();
      if (area && area.firstChild) {
        area.insertBefore(btn, area.firstChild);
      }
    }
  }

  function removeLoadMoreButton() {
    const btn = document.getElementById('sb-load-more-btn');
    if (btn) btn.remove();
  }

  function onLoadMore() {
    state.visibleCount += state.loadMoreBatch;
    applyWindowing();
  }

  // --- Send stats to popup ---
  function broadcastStats() {
    const turns = queryMessageTurns();
    const visible = Array.from(turns).filter((t) => t.dataset.sbHidden !== 'true').length;
    browser.runtime.sendMessage({
      type: 'stats',
      total: turns.length,
      visible: visible,
      enabled: state.enabled,
    }).catch(() => {
      // Popup not open, ignore
    });
  }

  // --- MutationObserver for new messages ---
  function startObserving() {
    if (state.observer) state.observer.disconnect();

    const area = queryConversationArea();
    if (!area) return;

    let debounceTimer = null;

    state.observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        applyWindowing();
      }, 200);
    });

    state.observer.observe(area, { childList: true, subtree: true });
  }

  // --- SPA navigation detection ---
  function startUrlObserver() {
    if (state.urlObserver) state.urlObserver.disconnect();

    state.urlObserver = new MutationObserver(() => {
      if (location.href !== state.lastUrl) {
        state.lastUrl = location.href;
        onNavigate();
      }
    });

    state.urlObserver.observe(document.body, { childList: true, subtree: true });
  }

  function onNavigate() {
    state.visibleCount = state.messageLimit;
    removeLoadMoreButton();

    setTimeout(() => {
      applyWindowing();
      startObserving();
    }, 500);
  }

  // --- Listen for messages from popup ---
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'getStats') {
      const turns = queryMessageTurns();
      const visible = Array.from(turns).filter((t) => t.dataset.sbHidden !== 'true').length;
      return Promise.resolve({
        total: turns.length,
        visible: visible,
        enabled: state.enabled,
      });
    }
  });

  // --- Init ---
  async function init() {
    await loadSettings();
    listenForSettingsChanges();
    applyWindowing();
    startObserving();
    startUrlObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
