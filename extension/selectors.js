// selectors.js — ChatGPT DOM selectors (centralized for easy maintenance)
// ChatGPT's DOM changes frequently. When selectors break, update only this file.

const SELECTORS = {
  // Primary: data-testid is the most stable attribute across ChatGPT updates
  messageTurn: 'section[data-testid^="conversation-turn-"]',

  // Fallbacks (tried in order if primary fails)
  messageTurnFallbacks: [
    '[data-testid="conversation-turn"]',
    'main article',
    '[data-message-author-role]',
  ],

  // The scrollable conversation area
  conversationArea: 'main',
  conversationAreaFallback: '[role="main"]',

  // For detecting streaming (assistant still typing)
  streaming: '.result-streaming',

  // Theme detection
  darkMode: 'html.dark',
};

/**
 * Find all message turn elements using primary selector with fallbacks.
 * @returns {NodeListOf<Element>} matched elements, or empty NodeList
 */
function queryMessageTurns() {
  let turns = document.querySelectorAll(SELECTORS.messageTurn);
  if (turns.length > 0) return turns;

  for (const fallback of SELECTORS.messageTurnFallbacks) {
    turns = document.querySelectorAll(fallback);
    if (turns.length > 0) return turns;
  }

  return document.querySelectorAll('.____never-match____');
}

/**
 * Find the scrollable conversation container.
 * @returns {Element|null}
 */
function queryConversationArea() {
  return (
    document.querySelector(SELECTORS.conversationArea) ||
    document.querySelector(SELECTORS.conversationAreaFallback)
  );
}
