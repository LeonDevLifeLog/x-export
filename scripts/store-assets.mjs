import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = join(root, 'store/assets');
const temporary = await mkdtemp(join(tmpdir(), 'x-export-store-'));
await cp(join(root, 'dist/x-export'), join(temporary, 'extension'), { recursive: true });
const extension = await realpath(join(temporary, 'extension'));
const id = [...createHash('sha256').update(extension).digest().subarray(0, 16)].map((byte) => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join('');
const context = await chromium.launchPersistentContext(join(temporary, 'profile'), {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, timezoneId: 'UTC',
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
const report = { version: JSON.parse(await readFile(join(extension, 'manifest.json'))).version, browser: context.browser().version(), content: 'Original built-in demo; no X account or third-party post data.', screenshots: [] };
async function inventory(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await inventory(join(directory, entry.name), file + '/'));
    else result.push({ file, sha256: createHash('sha256').update(await readFile(join(directory, entry.name))).digest('hex') });
  }
  return result.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
report.extensionTreeSha256 = createHash('sha256').update(JSON.stringify(await inventory(extension))).digest('hex');
const errors = [];
context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
try {
  for (const code of ['en', 'zh_CN']) {
    await mkdir(join(assets, code), { recursive: true });
    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/preview.html?demo=1`);
    await page.evaluate((language) => chrome.storage.local.set({ language }), code === 'en' ? 'en' : 'zh-CN');
    await page.reload();
    await page.waitForSelector('#studio:not([hidden])');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('html').getAttribute('lang'), code === 'en' ? 'en' : 'zh-CN');
    for (const theme of ['paper', 'minimal', 'midnight']) {
      // A prior capture can restore another theme; always reset scroll and selection.
      await page.locator(`input[name="theme"][value="${theme}"]`).check();
      await page.evaluate(() => document.fonts.ready);
      const filename = `${code}/01-${theme}.png`;
      await page.screenshot({ path: join(assets, filename) });
      report.screenshots.push({ file: filename, width: 1280, height: 800, source: 'Production extension, built-in demo preview' });
    }
    await page.locator('input[name="format"][value="md"]').check();
    const filename = `${code}/02-markdown.png`;
    await page.screenshot({ path: join(assets, filename) });
    report.screenshots.push({ file: filename, width: 1280, height: 800, source: 'Production extension, Markdown preview' });
    await page.goto(`chrome-extension://${id}/help.html`);
    await page.waitForFunction(() => document.querySelector('#version').textContent.includes('1.1.0'));
    await page.screenshot({ path: join(assets, code, '03-help.png') });
    report.screenshots.push({ file: `${code}/03-help.png`, width: 1280, height: 800, source: 'Production extension, help page' });
    await page.close();
  }
  await cp(join(extension, 'icons/128.png'), join(assets, 'icon-128.png'));
  const promo = await context.newPage();
  await promo.goto(pathToFileURL(join(root, 'store/promo.html')).href);
  await promo.setViewportSize({ width: 440, height: 280 });
  await promo.screenshot({ path: join(assets, 'promo-small-440x280.png') });
  await promo.setViewportSize({ width: 1400, height: 560 });
  await promo.screenshot({ path: join(assets, 'promo-marquee-1400x560.png') });
  // Draft hosting pages are also checked at desktop and narrow widths.
  const website = await context.newPage();
  await mkdir(join(root, 'artifacts'), { recursive: true });
  for (const file of ['index', 'privacy', 'support']) {
    await website.setViewportSize({ width: 1280, height: 900 });
    await website.goto(pathToFileURL(join(root, `store/site/${file}.html`)).href);
    await website.screenshot({ path: join(root, `artifacts/site-${file}.png`), fullPage: true });
    await website.setViewportSize({ width: 375, height: 900 });
    assert.ok(await website.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Site overflow: ${file}`);
  }
  assert.deepEqual(errors, []);
  await writeFile(join(assets, 'provenance.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Generated ${report.screenshots.length} localized screenshots, 2 promo images and store icon: ${assets}`);
} finally {
  await context.close();
  await rm(temporary, { recursive: true, force: true });
}
