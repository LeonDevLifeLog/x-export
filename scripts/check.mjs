import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await check(path);
    else if (/\.(m?js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      if (result.status) throw new Error(result.stderr);
    }
  }
}
await check(`${root}extension`);
await check(`${root}scripts`);
await check(`${root}tests`);
const manifest = JSON.parse(await readFile(`${root}extension/manifest.json`, 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Manifest V3 required');
for (const path of [manifest.action.default_popup, ...Object.values(manifest.icons)]) await access(`${root}extension/${path}`);
console.log('JavaScript 语法与扩展入口检查通过。');
