import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}dist/x-export`;
const manifest = JSON.parse(await readFile(`${root}extension/manifest.json`, 'utf8'));
await import('./icons.mjs');
await mkdir(`${root}dist`, { recursive: true });
await rm(output, { recursive: true, force: true });
await cp(`${root}extension`, output, { recursive: true });
const archive = `x-export-v${manifest.version}.zip`;
await rm(`${root}dist/${archive}`, { force: true });
const zipped = spawnSync('zip', ['-qr', archive, 'x-export'], { cwd: `${root}dist`, encoding: 'utf8' });
if (zipped.status !== 0) throw new Error(zipped.stderr || 'zip failed');
console.log(`Chrome 扩展目录：${output}\n扩展 ZIP：${root}dist/${archive}`);
