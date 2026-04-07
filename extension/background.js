// background.js — Storage initialization and icon state management

const DEFAULTS = {
  enabled: true,
  messageLimit: 30,
  tier: 'pro', // All features unlocked for now
};

// Initialize storage on first install
browser.runtime.onInstalled.addListener(async () => {
  const data = await browser.storage.local.get(Object.keys(DEFAULTS));
  const toSet = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (data[key] === undefined) {
      toSet[key] = value;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await browser.storage.local.set(toSet);
  }
});

// Update icon when enabled/disabled state changes
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.enabled !== undefined) {
    updateIcon(changes.enabled.newValue);
  }
});

async function updateIcon(enabled) {
  const suffix = enabled ? '' : '-disabled';
  await browser.browserAction.setIcon({
    path: {
      48: `icons/icon-48${suffix}.png`,
      96: `icons/icon-96${suffix}.png`,
      128: `icons/icon-128${suffix}.png`,
    },
  });
}

// Set initial icon state on startup
(async () => {
  const data = await browser.storage.local.get('enabled');
  updateIcon(data.enabled !== false);
})();
