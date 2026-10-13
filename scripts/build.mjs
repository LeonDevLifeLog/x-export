import { cp, mkdir, readFile, readdir, rm, utimes } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}dist/x-export`;
const manifest = JSON.parse(await readFile(`${root}extension/manifest.json`, 'utf8'));
await import('./icons.mjs');
await mkdir(`${root}dist`, { recursive: true });
await rm(output, { recursive: true, force: true });
await cp(`${root}extension`, output, { recursive: true, filter: (source) => !source.endsWith('/.DS_Store') });
const archive = `x-export-v${manifest.version}.zip`;
await rm(`${root}dist/${archive}`, { force: true });
// The store uploader expects manifest.json at the archive root.
async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await inventory(`${directory}/${entry.name}`, `${path}/`));
    else files.push(path);
  }
  return files.sort();
}
const files = await inventory(output);
// Stable file ordering and timestamps make repeated release ZIPs identical.
const timestamp = new Date('2000-01-01T00:00:00Z');
for (const file of files) await utimes(`${output}/${file}`, timestamp, timestamp);
const zipped = spawnSync('zip', ['-Xq', `${root}dist/${archive}`, ...files], { cwd: output, encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
if (zipped.status !== 0) throw new Error(zipped.stderr || 'zip failed');
console.log(`Chrome 扩展目录：${output}\n扩展 ZIP：${root}dist/${archive}`);
