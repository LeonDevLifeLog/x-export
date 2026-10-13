import { initializeI18n, saveLanguage, t } from './lib/i18n.js';

await initializeI18n();
document.querySelector('#language').addEventListener('change', async (event) => { await saveLanguage(event.target.value); location.reload(); });

import { extractXPage } from './lib/extract.js';

const button = document.querySelector('#capture');
const label = document.querySelector('#capture-label');
const status = document.querySelector('#status');
let tab;

try {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const supported = tab?.url && /^(www\.|mobile\.)?(x\.com|twitter\.com)$/.test(new URL(tab.url).hostname);
  document.querySelector('#site-status').textContent = supported ? t('xPageReady') : t('openXFirst');
  button.disabled = !supported;
} catch {
  document.querySelector('#site-status').textContent = t('extensionOnly');
}

button.addEventListener('click', async () => {
  button.disabled = true;
  label.textContent = t('capturing');
  status.textContent = '';
  status.className = 'status';
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractXPage });
    const doc = result?.result;
    if (!doc?.posts?.length) throw new Error(t('noContent'));
    if (JSON.stringify(doc).length > 2_000_000) throw new Error(t('contentTooLarge'));
    const records = await chrome.storage.session.get(null);
    const stale = Object.entries(records).filter(([key, value]) => key.startsWith('doc:') && Date.now() - value.createdAt > 24 * 60 * 60 * 1000).map(([key]) => key);
    if (stale.length) await chrome.storage.session.remove(stale);
    const id = crypto.randomUUID();
    await chrome.storage.session.set({ [`doc:${id}`]: { document: doc, createdAt: Date.now() } });
    await chrome.tabs.create({ url: chrome.runtime.getURL(`preview.html?id=${id}`) });
    window.close();
  } catch (error) {
    status.className = 'status error';
    status.textContent = error.message.includes('Cannot access') ? t('captureDenied') : error.message.includes('X_EXPORT_NO_CONTENT') ? t('noContent') : [t('noContent'), t('contentTooLarge')].includes(error.message) ? error.message : t('captureFailed');
    button.disabled = false;
    label.textContent = t('captureRetry');
  }
});
