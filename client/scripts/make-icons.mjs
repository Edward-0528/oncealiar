#!/usr/bin/env node
/**
 * Generates the PWA icons (Tabloid Spy palette) with zero dependencies:
 *   node client/scripts/make-icons.mjs
 * Writes icon.svg, icon-maskable.svg and PNGs (192, 512, maskable 512, apple-touch 180)
 * into client/public. Shapes: newsprint-yellow field, ink domino mask, siren-red stamp bar.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const YELLOW = [0xff, 0xe1, 0x4d];
const INK = [0x11, 0x11, 0x11];
const RED = [0xe8, 0x32, 0x2a];

// ---- geometry on a 512 grid (shared by SVG + raster) ----
const MASK = { cx: 256, cy: 250, rx: 206, ry: 112 };
const NOTCH = { cx: 256, cy: 128, r: 46 }; // nose-bridge notch cut from the top edge
const EYES = [
  { cx: 170, cy: 246, rx: 60, ry: 40 },
  { cx: 342, cy: 246, rx: 60, ry: 40 }
];
const BAR = { cx: 256, cy: 404, w: 268, h: 46, rot: -6 }; // degrees

const inEllipse = (x, y, e) => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 <= 1;
const inCircle = (x, y, c) => (x - c.cx) ** 2 + (y - c.cy) ** 2 <= c.r ** 2;
function inBar(x, y) {
  const a = (-BAR.rot * Math.PI) / 180;
  const dx = x - BAR.cx, dy = y - BAR.cy;
  const rx = dx * Math.cos(a) - dy * Math.sin(a);
  const ry = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(rx) <= BAR.w / 2 && Math.abs(ry) <= BAR.h / 2;
}
function colorAt(x, y) {
  if (inBar(x, y)) return RED;
  if (inEllipse(x, y, MASK) && !inCircle(x, y, NOTCH) && !EYES.some((e) => inEllipse(x, y, e))) return INK;
  return YELLOW;
}

function render(size, scale = 1) {
  const SS = 4;
  const px = Buffer.alloc(size * (size * 3 + 1));
  for (let j = 0; j < size; j++) {
    px[j * (size * 3 + 1)] = 0; // filter: none
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0;
      for (let sj = 0; sj < SS; sj++)
        for (let si = 0; si < SS; si++) {
          // map pixel → 512 grid, scaled around the centre (maskable safe zone)
          const u = ((i + (si + 0.5) / SS) / size) * 512;
          const v = ((j + (sj + 0.5) / SS) / size) * 512;
          const c = colorAt(256 + (u - 256) / scale, 256 + (v - 256) / scale);
          r += c[0]; g += c[1]; b += c[2];
        }
      const o = j * (size * 3 + 1) + 1 + i * 3;
      const n = SS * SS;
      px[o] = Math.round(r / n); px[o + 1] = Math.round(g / n); px[o + 2] = Math.round(b / n);
    }
  }
  return png(size, size, px);
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function svg(scale = 1) {
  const t = scale === 1 ? '' : ` transform="translate(256 256) scale(${scale}) translate(-256 -256)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <mask id="m"><rect width="512" height="512" fill="#fff"/><circle cx="${NOTCH.cx}" cy="${NOTCH.cy}" r="${NOTCH.r}" fill="#000"/>${EYES.map((e) => `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="#000"/>`).join('')}</mask>
  </defs>
  <rect width="512" height="512" fill="#FFE14D"/>
  <g${t}>
    <ellipse cx="${MASK.cx}" cy="${MASK.cy}" rx="${MASK.rx}" ry="${MASK.ry}" fill="#111" mask="url(#m)"/>
    <rect x="${BAR.cx - BAR.w / 2}" y="${BAR.cy - BAR.h / 2}" width="${BAR.w}" height="${BAR.h}" fill="#E8322A" transform="rotate(${BAR.rot} ${BAR.cx} ${BAR.cy})"/>
  </g>
</svg>
`;
}

fs.writeFileSync(path.join(out, 'icon.svg'), svg());
fs.writeFileSync(path.join(out, 'icon-maskable.svg'), svg(0.78));
fs.writeFileSync(path.join(out, 'icon-192.png'), render(192));
fs.writeFileSync(path.join(out, 'icon-512.png'), render(512));
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), render(512, 0.78));
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), render(180, 0.9));
console.log('icons written to', out);
