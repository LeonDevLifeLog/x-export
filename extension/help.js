import { initializeI18n, saveLanguage, t } from './lib/i18n.js';

await initializeI18n();
document.querySelector('#language').addEventListener('change', async (event) => { await saveLanguage(event.target.value); location.reload(); });
document.querySelector('#version').textContent = t('versionLabel', globalThis.chrome?.runtime?.getManifest?.().version || '1.1.0');
const clear = document.querySelector('#clear-documents');
clear.disabled = !globalThis.chrome?.storage?.session;
clear.addEventListener('click', async () => {
  if (!confirm(t('clearConfirm'))) return;
  clear.disabled = true;
  const status = document.querySelector('#status');
  try {
    const records = await chrome.storage.session.get(null);
    await chrome.storage.session.remove(Object.keys(records).filter((key) => key.startsWith('doc:')));
    status.className = 'status'; status.textContent = t('clearDone');
  } catch { status.className = 'status error'; status.textContent = t('clearFailed'); }
  finally { clear.disabled = false; }
});

// Localization changes the page height after the initial fragment navigation.
if (location.hash === '#about-developer') document.querySelector('#about-developer').scrollIntoView({ block: 'start' });
