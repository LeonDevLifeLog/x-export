import { extractXPage } from './lib/extract.js';

const button = document.querySelector('#capture');
const label = document.querySelector('#capture-label');
const status = document.querySelector('#status');
let tab;

try {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const supported = tab?.url && /^(www\.|mobile\.)?(x\.com|twitter\.com)$/.test(new URL(tab.url).hostname);
  document.querySelector('#site-status').textContent = supported ? 'X 页面 · 读取当前账号可见的内容' : '请先登录 X，并打开一篇帖子或长文';
  button.disabled = !supported;
} catch {
  document.querySelector('#site-status').textContent = '请在 Chrome 扩展中使用，或体验示例';
}

button.addEventListener('click', async () => {
  button.disabled = true;
  label.textContent = '正在读取…';
  status.textContent = '';
  status.className = 'status';
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractXPage });
    const doc = result?.result;
    if (!doc?.posts?.length) throw new Error('没有读取到发文，请展开正文后重试。');
    if (JSON.stringify(doc).length > 2_000_000) throw new Error('当前内容过大，请减少页面已加载的发文后重试。');
    const records = await chrome.storage.session.get(null);
    const stale = Object.entries(records).filter(([key, value]) => key.startsWith('doc:') && Date.now() - value.createdAt > 24 * 60 * 60 * 1000).map(([key]) => key);
    if (stale.length) await chrome.storage.session.remove(stale);
    const id = crypto.randomUUID();
    await chrome.storage.session.set({ [`doc:${id}`]: { document: doc, createdAt: Date.now() } });
    await chrome.tabs.create({ url: chrome.runtime.getURL(`preview.html?id=${id}`) });
    window.close();
  } catch (error) {
    status.className = 'status error';
    status.textContent = error.message.includes('Cannot access') ? '当前页面无法读取，请刷新 X 页面后重试。' : error.message;
    button.disabled = false;
    label.textContent = '重新读取';
  }
});
