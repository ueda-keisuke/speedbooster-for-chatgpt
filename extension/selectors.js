// selectors.js — ChatGPT DOM selectors (centralized for easy maintenance)
// ChatGPT's DOM changes frequently. When selectors break, update only this file.

(function () {
  'use strict';

  if (globalThis.__sbSelectorsLoaded) {
    return;
  }
  globalThis.__sbSelectorsLoaded = true;

  const selectors = {
    messageTurn: 'section[data-testid^="conversation-turn-"]',
    messageTurnFallbacks: [
      '[data-testid="conversation-turn"]',
      'main article',
      '[data-message-author-role]',
    ],
    conversationArea: 'main',
    conversationAreaFallback: '[role="main"]',
    streaming: '.result-streaming',
    darkMode: 'html.dark',
  };

  function queryMessageTurns() {
    let turns = document.querySelectorAll(selectors.messageTurn);
    if (turns.length > 0) return turns;

    for (const fallback of selectors.messageTurnFallbacks) {
      turns = document.querySelectorAll(fallback);
      if (turns.length > 0) return turns;
    }

    return document.querySelectorAll('.____never-match____');
  }

  function queryConversationArea() {
    return (
      document.querySelector(selectors.conversationArea) ||
      document.querySelector(selectors.conversationAreaFallback)
    );
  }

  globalThis.SELECTORS = selectors;
  globalThis.queryMessageTurns = queryMessageTurns;
  globalThis.queryConversationArea = queryConversationArea;
})();
