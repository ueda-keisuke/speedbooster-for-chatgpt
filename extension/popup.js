// popup.js — Settings UI logic

const toggleEl = document.getElementById('toggle-enabled');
const sliderEl = document.getElementById('message-limit');
const limitValueEl = document.getElementById('limit-value');
const statsTextEl = document.getElementById('stats-text');

// Load current settings
async function loadSettings() {
  const data = await browser.storage.local.get(['enabled', 'messageLimit']);
  const enabled = data.enabled !== false;
  const limit = data.messageLimit || 30;

  toggleEl.checked = enabled;
  sliderEl.value = limit;
  limitValueEl.textContent = limit;
  document.body.classList.toggle('disabled', !enabled);
}

// Load stats from content script
async function loadStats() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const response = await browser.tabs.sendMessage(tab.id, { type: 'getStats' });
    if (response) {
      statsTextEl.textContent = `Showing ${response.visible} of ${response.total} messages`;
    }
  } catch {
    statsTextEl.textContent = 'Open a ChatGPT conversation to see stats';
  }
}

// Toggle enabled
toggleEl.addEventListener('change', async () => {
  const enabled = toggleEl.checked;
  await browser.storage.local.set({ enabled });
  document.body.classList.toggle('disabled', !enabled);
  loadStats();
});

// Slider change
sliderEl.addEventListener('input', () => {
  limitValueEl.textContent = sliderEl.value;
});

sliderEl.addEventListener('change', async () => {
  const messageLimit = parseInt(sliderEl.value, 10);
  await browser.storage.local.set({ messageLimit });
  setTimeout(loadStats, 300);
});

// Init
loadSettings();
loadStats();
