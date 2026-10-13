import assert from 'node:assert/strict';
import { readdir, readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'extension/manifest.json')));
const pkg = JSON.parse(await readFile(join(root, 'package.json')));
const metadata = JSON.parse(await readFile(join(root, 'store/metadata.json')));
assert.equal(manifest.version, pkg.version);
assert.equal(metadata.version, manifest.version);
assert.equal(manifest.default_locale, 'en');
assert.equal(manifest.manifest_version, 3);
assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'downloads', 'scripting', 'storage']);
assert.ok(!manifest.host_permissions?.length);
assert.deepEqual(manifest.optional_host_permissions, ['https://pbs.twimg.com/*']);
assert.ok(!manifest.content_scripts && !manifest.background && !manifest.web_accessible_resources);
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await files(join(directory, entry.name), relative + '/'));
    else result.push(relative);
  }
  return result.sort();
}
const sourceFiles = await files(join(root, 'extension'));
const report = { version: manifest.version, extensionFiles: [], images: [], pendingExternalFields: [], localMaterialsVerified: false, submissionReady: false };
const catalogs = {};
for (const code of ['en', 'zh_CN']) {
  const catalog = JSON.parse(await readFile(join(root, 'extension/_locales', code, 'messages.json')));
  catalogs[code] = catalog;
  assert.equal(metadata.locales[code].name, catalog.extName.message);
  assert.equal(metadata.locales[code].shortDescription, catalog.extDescription.message);
  assert.ok(catalog.extName.message.length <= 75);
  assert.ok(catalog.extDescription.message.length <= 132);
  const listing = await readFile(join(root, 'store', metadata.locales[code].detailedDescriptionFile), 'utf8');
  assert.ok(listing.trim().length > 100 && listing.length <= 16000);
  for (const image of metadata.locales[code].screenshots) await readFile(join(root, 'store', image));
}
assert.deepEqual(Object.keys(catalogs.en).sort(), Object.keys(catalogs.zh_CN).sort());
for (const file of sourceFiles.filter((file) => /\.(html|js)$/.test(file))) {
  const text = await readFile(join(root, 'extension', file), 'utf8');
  assert.ok(!/<script[^>]+src=["']https?:/i.test(text), `Remote script in ${file}`);
  assert.ok(!/\beval\s*\(|new\s+Function\s*\(/.test(text), `Dynamic code in ${file}`);
  for (const match of text.matchAll(/(?:data-i18n(?:-aria)?=["']|\bt\(['"])([a-zA-Z]+)["']/g)) {
    assert.ok(catalogs.en[match[1]], `Missing message ${match[1]} in ${file}`);
  }
}
const archive = join(root, 'dist', `x-export-v${manifest.version}.zip`);
const listing = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
assert.equal(listing.status, 0, listing.stderr);
const zipFiles = listing.stdout.trim().split('\n').filter((file) => !file.endsWith('/')).sort();
assert.deepEqual(zipFiles, sourceFiles, 'ZIP must contain only runtime source files, with manifest at root');
assert.deepEqual(await files(join(root, 'dist/x-export')), sourceFiles);
for (const file of sourceFiles) {
  const source = await readFile(join(root, 'extension', file));
  assert.ok(source.equals(await readFile(join(root, 'dist/x-export', file))), `Stale build file: ${file}`);
  const unzipped = spawnSync('unzip', ['-p', archive, file], { maxBuffer: 5 * 1024 * 1024 });
  assert.equal(unzipped.status, 0);
  assert.ok(source.equals(unzipped.stdout), `ZIP content mismatch: ${file}`);
  report.extensionFiles.push({ file, bytes: source.length, sha256: sha256(source) });
}
async function checkPNG(file, width, height, transparent = false) {
  const buffer = await readFile(join(root, 'store', file));
  assert.ok(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  assert.equal(buffer.readUInt32BE(16), width, file);
  assert.equal(buffer.readUInt32BE(20), height, file);
  assert.equal(buffer[24], 8, 'PNG must use 8-bit channels');
  assert.equal(buffer[25], transparent ? 6 : 2, 'Store screenshots/promo images must be RGB without alpha');
  if (transparent) {
    // Generated icon uses PNG filter 0; verify the actual 16px transparent margin.
    const chunks = [];
    for (let offset = 8; offset < buffer.length;) {
      const size = buffer.readUInt32BE(offset);
      if (buffer.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(buffer.subarray(offset + 8, offset + 8 + size));
      offset += size + 12;
    }
    const raw = inflateSync(Buffer.concat(chunks));
    for (let y = 0; y < height; y++) {
      assert.equal(raw[y * (width * 4 + 1)], 0);
      for (let x = 0; x < width; x++) if (x < 16 || x >= width - 16 || y < 16 || y >= height - 16) assert.equal(raw[y * (width * 4 + 1) + 1 + x * 4 + 3], 0);
    }
    assert.ok(buffer.equals(await readFile(join(root, 'extension/icons/128.png'))));
  }
  report.images.push({ file, width, height, bytes: buffer.length, sha256: sha256(buffer) });
}
await checkPNG('assets/icon-128.png', 128, 128, true);
await checkPNG('assets/promo-small-440x280.png', 440, 280);
await checkPNG('assets/promo-marquee-1400x560.png', 1400, 560);
for (const locale of Object.values(metadata.locales)) for (const file of locale.screenshots) await checkPNG(file, 1280, 800);
const provenance = JSON.parse(await readFile(join(root, 'store/assets/provenance.json')));
assert.equal(provenance.version, manifest.version);
assert.equal(provenance.screenshots.length, 10);
assert.equal(provenance.extensionTreeSha256, sha256(Buffer.from(JSON.stringify(report.extensionFiles.map(({ file, sha256 }) => ({ file, sha256 }))))), 'Screenshots must be regenerated after runtime changes');
for (const file of ['SUBMISSION.md', 'PRIVACY-DISCLOSURES.md', 'REVIEWER-INSTRUCTIONS.md', 'site/index.html', 'site/privacy.html', 'site/support.html']) await readFile(join(root, 'store', file));
const publicPolicy = await readFile(join(root, 'store/site/privacy.html'), 'utf8');
assert.equal(publicPolicy, (await readFile(join(root, 'extension/privacy.html'), 'utf8')).replace('href="help.html"', 'href="support.html"'));
for (const file of ['store/site/index.html', 'store/site/privacy.html', 'store/site/support.html', 'extension/privacy.html']) {
  const text = await readFile(join(root, file), 'utf8');
  for (const match of text.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    if (!/^https?:/.test(match[1])) await access(join(root, dirname(file), match[1]));
  }
}
for (const field of ['privacyPolicyUrl', 'supportUrl']) {
  if (!metadata[field]) report.pendingExternalFields.push(field);
  else assert.equal(new URL(metadata[field]).protocol, 'https:');
}
report.pendingExternalFields.push('Developer account and reviewer login, if required', 'Signed-in personal Chrome end-to-end check; native MD/HTML save and permission revocation checks');
report.archive = { file: `x-export-v${manifest.version}.zip`, sha256: sha256(await readFile(archive)) };
report.localMaterialsVerified = true;
await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist/webstore-check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Local package and ${report.images.length} store images verified. Submission prerequisites: ${report.pendingExternalFields.join('; ')}`);
