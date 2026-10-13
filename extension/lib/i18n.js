export let locale = 'en';
let messages = {};
let catalogs;

export function resolveLocale(language) {
  return /^zh(?:[-_]CN)?$/i.test(language || '') || /^zh[-_](CN|SG|Hans)(?:[-_]|$)/i.test(language || '') ? 'zh-CN' : 'en';
}

// Exported for the document renderer, which also runs outside Chrome in tests.
export function configureI18n(language, catalog) {
  locale = resolveLocale(language);
  messages = catalog;
}

export function t(key, ...substitutions) {
  const message = messages[key]?.message;
  if (message === undefined) throw new Error(`Missing translation: ${key}`);
  return message.replace(/\$(\d)/g, (_, index) => String(substitutions[Number(index) - 1] ?? ''));
}

export async function initializeI18n() {
  if (!catalogs) {
    catalogs = Object.fromEntries(await Promise.all(['en', 'zh_CN'].map(async (code) => {
      const response = await fetch(new URL(`../_locales/${code}/messages.json`, import.meta.url));
      if (!response.ok) throw new Error(`Cannot load locale: ${code}`);
      return [code, await response.json()];
    })));
  }
  let preference = 'auto';
  if (globalThis.chrome?.storage?.local) {
    preference = (await chrome.storage.local.get('language')).language || 'auto';
  } else preference = localStorage.getItem('language') || 'auto';
  const language = preference === 'auto' ? (globalThis.chrome?.i18n?.getUILanguage() || navigator.language) : preference;
  const resolved = resolveLocale(language);
  configureI18n(resolved, catalogs[resolved === 'zh-CN' ? 'zh_CN' : 'en']);
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nAria)); });
  const select = document.querySelector('#language');
  if (select) select.value = ['auto', 'en', 'zh-CN'].includes(preference) ? preference : 'auto';
}

export async function saveLanguage(language) {
  if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ language });
  else localStorage.setItem('language', language);
}

export function number(value) { return new Intl.NumberFormat(locale).format(value); }
