# ChatGPT DOM Structure Research (2026-04)

## Sources

This document is based on research from open-source projects, NOT direct inspection of the Chrome extension (closed source) or live ChatGPT DOM verification.

- [Noah4ever/ai-chat-speed-booster](https://github.com/Noah4ever/ai-chat-speed-booster)
- [owan-lin/chatgpt-dom-reducer](https://github.com/owan-lin/chatgpt-dom-reducer)
- [chainyaw/chatgpt-dom-pruner](https://github.com/chainyaw/chatgpt-dom-pruner)
- [bramvdg/chatgpt-lag-fixer](https://github.com/bramvdg/chatgpt-lag-fixer)
- [OpenAI Community thread](https://community.openai.com/t/better-fix-for-chatgpt-lag-freezing-in-long-chats-local-chrome-extension/1372183)

## Message Selectors (reliability order)

| Priority | Selector | Notes |
|---|---|---|
| 1 | `section[data-testid^="conversation-turn-"]` | Most stable. Numbered sequentially: turn-0, turn-1, etc. Even=user, odd=assistant. |
| 2 | `[data-testid="conversation-turn"]` | Same attribute without number suffix (chainyaw/chatgpt-dom-pruner) |
| 3 | `main article` | `article` elements inside `main` wrap message content |
| 4 | `[data-message-author-role]` | Values: `"user"`, `"assistant"`, `"system"` |
| 5 | `[data-message-id]` | Unique per message, used by save/export scripts |
| 6 | `div.markdown.prose.markdown-new-styling` | Assistant response body (last-resort fallback) |

### Recommended fallback chain (from chatgpt-dom-reducer)

```javascript
const selectors = [
    "article",
    '[data-message-author-role]',
    "main article",
    "div[data-testid*='conversation'] article",
];
```

## Unique Message Identification

- `data-turn-id` — separate from `data-testid`, used by AI Chat Speed Booster for per-turn tracking/caching

## Scroll Container

| Selector | Source |
|---|---|
| `main` | AI Chat Speed Booster |
| `main[class*="conversation" i]` | chatgpt-lag-fixer |
| `[role="main"]` | chatgpt-lag-fixer fallback |
| `div[data-scroll-root]` | AI Chat Speed Booster (scroll root anchor) |
| Walk ancestors checking `overflow-y: auto/scroll` with `scrollHeight > clientHeight` | chatgpt-dom-reducer dynamic detection |

## Detecting New Messages (MutationObserver)

```javascript
const target = document.querySelector("main") || document.body;
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if it matches a message selector
            }
        }
    }
});
observer.observe(target, { childList: true, subtree: true });
```

### Detecting streaming completion

Assistant responses carry `result-streaming` CSS class while generating. When streaming finishes, the class is removed:

```javascript
observer.observe(messageNode, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
});
// In callback: check !node.classList.contains('result-streaming')
```

## SPA Navigation Detection

ChatGPT is a single-page app. No page reload on conversation switch. Strategies:

1. **URL monitoring** — conversations are at `/c/{id}`, watch `location.pathname`
2. **MutationObserver on body** — fires when conversation container is swapped
3. **Periodic scroll container validation** — check if container reference is still in DOM

## Conversation API Response Structure

`GET /backend-api/conversation/{conversation_id}` returns:

```json
{
  "title": "...",
  "mapping": {
    "msg-id-1": {
      "id": "msg-id-1",
      "parent": null,
      "children": ["msg-id-2"],
      "message": { "content": {...}, "author": { "role": "system" }, ... }
    },
    "msg-id-2": {
      "id": "msg-id-2",
      "parent": "msg-id-1",
      "children": ["msg-id-3"],
      "message": { "content": {...}, "author": { "role": "user" }, ... }
    }
  },
  "current_node": "msg-id-last"
}
```

Messages form a tree (linked list). To trim: walk `parent` from `current_node`, keep last N, preserve path to root.

## Other Useful Selectors

| Element | Selector |
|---|---|
| Stop/cancel streaming | `[data-testid="stop-button"]` |
| Send prompt button | `[aria-label="Send prompt"]` |
| Prompt textarea | `#prompt-textarea` |
| Model switcher | `[data-testid="model-switcher-dropdown-button"]` |
| Conversation options | `[data-testid="conversation-options-button"]` |
| Sidebar history items | `ol > li[data-testid*="history-item-"]` |
| Canvas detection | `[aria-label*="Canvas"], [data-testid*="canvas" i]` |
| Theme detection | `html.dark` / `html.light` |
| Code blocks | `#code-block-viewer`, `.cm-content` |

## Warnings

1. **Class names are unstable.** ChatGPT uses hashed/generated CSS classes (e.g., `react-scroll-to-bottom--css-qvfmh-79elbk`). Never rely on these.
2. **`data-testid` is the most stable** selector across deployments.
3. **DOM structure changes periodically.** Old selectors like `ThreadLayout__NodeWrapper` and `ConversationItem__ConversationItemWrapper-sc` are defunct.
4. **Use a fallback chain** rather than depending on a single selector.
5. **This document has NOT been verified against live ChatGPT as of 2026-04.** Selectors may be outdated. Verify with browser dev tools before relying on them.

## Verification Commands

Run these in Safari dev tools console on a ChatGPT conversation page:

```javascript
// Check primary selector
document.querySelectorAll('section[data-testid^="conversation-turn-"]').length

// Check fallbacks
document.querySelectorAll('main article').length
document.querySelectorAll('[data-message-author-role]').length

// Check scroll container
document.querySelector('main')
document.querySelector('div[data-scroll-root]')

// Check streaming state
document.querySelector('.result-streaming')
```
