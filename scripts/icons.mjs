import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../extension/icons/', import.meta.url));
await mkdir(directory, { recursive: true });
const crc = (buffer) => {
  let value = 0xffffffff;
  for (const byte of buffer) { value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); }
  return (value ^ 0xffffffff) >>> 0;
};
const chunk = (name, data) => {
  const type = Buffer.from(name); const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
};
// Draw a small document-and-arrow mark, with 4x supersampling for toolbar sizes.
for (const size of [16, 32, 48, 128]) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const sample = (x, y) => {
    // Chrome Web Store square artwork: 96px with 16px transparent padding.
    if (size === 128) {
      if (x < 16 || y < 16 || x >= 112 || y >= 112) return [0, 0, 0, 0];
      x = (x - 16) / .75; y = (y - 16) / .75;
    }
    const r = 21; const dx = Math.max(r - x, 0, x - (128 - r)); const dy = Math.max(r - y, 0, y - (128 - r));
    if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0];
    let color = [36, 91, 69, 255];
    if (x >= 33 && x <= 80 && y >= 24 && y <= 102) color = [250, 247, 232, 255];
    if (x > 64 && y < 40 && x + (40 - y) > 80) color = [36, 91, 69, 255];
    if (x >= 44 && x <= 65 && ((y >= 50 && y <= 54) || (y >= 62 && y <= 66) || (y >= 74 && y <= 78))) color = [113, 149, 119, 255];
    if (x >= 75 && x <= 105 && y >= 66 && y <= 72) color = [196, 222, 170, 255];
    if (x >= 91 && x <= 108 && Math.abs(y - 69) <= (x - 91) * .85 && Math.abs(y - 69) >= (x - 98) * .85) color = [196, 222, 170, 255];
    return color;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) sample((x + (sx + .5) / 4) * 128 / size, (y + (sy + .5) / 4) * 128 / size).forEach((value, index) => { sum[index] += value; });
      sum.forEach((value, index) => { raw[y * (size * 4 + 1) + 1 + x * 4 + index] = Math.round(value / 16); });
    }
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  await writeFile(`${directory}/${size}.png`, png);
}
