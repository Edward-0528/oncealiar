/**
 * Character asset exporter: renders the in-game avatar components (the same code the app
 * draws) to standalone SVG / PNG / WebP plus marketing compositions.
 *
 *   npm run assets                 # everything -> Google Drive + repo web assets
 *   npm run assets -- --out <dir>  # write marketing files to <dir>/<topic> instead (e.g. a scratch dir)
 *
 * Drive destinations come from the owner's helper (never hand-built):
 *   ~/.claude/skills/project-assets/assetpath.sh OnceALiar marketing <characters|promo-art|app-icon>
 *   npm run assets -- --no-repo    # skip client/public + landing/img copies
 *
 * Fonts: uses Impact / Arial Black / Courier New (macOS system fonts) for headlines.
 */
import { existsSync, mkdirSync, writeFileSync, statSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import { join, resolve } from 'path';
import sharp from 'sharp';
import { ALL_AVATARS, AVATARS, AVATAR_INFO, PLAYER_COLORS } from '@oncealiar/shared';
import { MOODS } from '../../client/src/components/avatars/kit';
import { characterSvg, place, rasterize, PC } from './render';

const ROOT = resolve(__dirname, '../..');
const HELPER = join(homedir(), '.claude/skills/project-assets/assetpath.sh');

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const OUT_BASE = outArg >= 0 ? resolve(args[outArg + 1]) : null;
const REPO = !args.includes('--no-repo');

/** Destination folder for a marketing topic. */
function topicDir(topic: string): string {
  if (OUT_BASE) return join(OUT_BASE, topic);
  if (!existsSync(HELPER)) throw new Error(`Asset helper not found: ${HELPER} (use --out <dir>)`);
  return execFileSync(HELPER, ['OnceALiar', 'marketing', topic], { encoding: 'utf8' }).trim();
}

const INK = '#111';
const YELLOW = '#FFE14D';
const RED = '#E8322A';
const MANILA = '#F1E3C2';
const PAPER = '#FFFDF5';
const HEAD = "font-family=\"Impact, 'Arial Black', sans-serif\"";
const TYPE = "font-family=\"'Courier New', monospace\" font-weight=\"bold\"";

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const halftone = (id: string, color = INK, op = 0.13, step = 18, r = 2.6) =>
  `<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><circle cx="${step / 2}" cy="${step / 2}" r="${r}" fill="${color}" fill-opacity="${op}"/></pattern>`;
const doc = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const written: { path: string; bytes: number }[] = [];
function out(rel: string, data: Buffer | string, base: string) {
  const p = join(base, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, data);
  written.push({ path: p, bytes: statSync(p).size });
}
const png = (buf: Buffer) => sharp(buf).png({ compressionLevel: 9 }).toBuffer();
const smallPng = (buf: Buffer, colors = 128) => sharp(buf).png({ palette: true, quality: 85, colors, compressionLevel: 9, effort: 10 }).toBuffer();

/* ------------------------------------------------------------ the mask mark */

const MASK_D = 'M3 9 Q17 1 32 9 Q47 1 61 9 Q61 31 45 33 Q36 34 32 25 Q28 34 19 33 Q3 31 3 9 Z';
/** Spy mask (from Logo.tsx MaskMark) with a hard ink offset shadow; drawn in its 64x40 space. */
const maskMark = (x: number, y: number, w: number) => {
  const k = w / 64;
  return `<g transform="translate(${x} ${y}) scale(${k})">
    <path d="${MASK_D}" transform="translate(2.2 2.6)" fill="${INK}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${MASK_D}" fill="${RED}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M9 12 Q14 7 21 8" fill="none" stroke="${PAPER}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="19" cy="17" rx="7" ry="4.6" fill="${INK}"/><ellipse cx="45" cy="17" rx="7" ry="4.6" fill="${INK}"/>
    <circle cx="32" cy="5.5" r="3" fill="${PAPER}" stroke="${INK}" stroke-width="2"/></g>`;
};

/** App icon: red spy mask on halftone yellow. `pad` shrinks the art for maskable icons. */
function iconSvg(pad = 1) {
  const w = 840 * pad;
  return doc(1024, 1024, `<defs>${halftone('h', INK, 0.1, 64, 9)}</defs><rect width="1024" height="1024" fill="${YELLOW}"/><rect width="1024" height="1024" fill="url(#h)"/>${maskMark((1024 - w) / 2 - 10 * pad, 512 - (w * 40) / 64 / 2, w)}`);
}

/* ------------------------------------------------------------ compositions */

function lineupPoster() {
  const W = 2400;
  const H = 1350;
  const free = AVATARS as readonly string[];
  const colW = 2200 / free.length;
  let wall = '';
  for (let i = 0; i <= 12; i++) {
    const y = 470 + i * 60;
    wall += `<path d="M100 ${y} H2300" stroke="${INK}" stroke-opacity="${i % 2 ? 0.18 : 0.35}" stroke-width="${i % 2 ? 2 : 4}"/>`;
    if (i % 2 === 0) wall += `<text x="80" y="${y + 10}" ${TYPE} font-size="26" fill="${INK}" text-anchor="end">${7 - i / 2}'</text><text x="2320" y="${y + 10}" ${TYPE} font-size="26" fill="${INK}">${7 - i / 2}'</text>`;
  }
  let cast = '';
  free.forEach((id, i) => {
    const cx = 100 + colW * (i + 0.5);
    const size = colW * 1.24;
    cast += place(id, cx - size / 2, 690, size, { color: PLAYER_COLORS[(i * 3) % PLAYER_COLORS.length], sticker: true });
    const name = AVATAR_INFO[id as keyof typeof AVATAR_INFO].name.toUpperCase();
    const fs = name.length > 13 ? 22 : 26;
    cast += `<g transform="rotate(${i % 2 ? 2 : -2} ${cx} 1030)"><rect x="${cx - colW / 2 + 8}" y="${985}" width="${colW - 16}" height="96" fill="${INK}"/><text x="${cx}" y="${1025}" ${TYPE} font-size="24" fill="${YELLOW}" text-anchor="middle">No. ${String(i + 1).padStart(2, '0')}</text><text x="${cx}" y="${1065}" ${HEAD} font-size="${fs}" fill="${PAPER}" text-anchor="middle">${esc(name)}</text></g>`;
  });
  const body = `<defs>${halftone('h')}${halftone('hy', INK, 0.12, 14, 2)}</defs>
    <rect width="${W}" height="${H}" fill="${MANILA}"/><rect width="${W}" height="${H}" fill="url(#h)"/>
    <rect width="${W}" height="96" fill="${INK}"/>
    <text x="60" y="70" ${HEAD} font-size="64" fill="${YELLOW}" letter-spacing="2">THE DAILY FIB</text>
    <text x="${W - 60}" y="62" ${TYPE} font-size="30" fill="${PAPER}" text-anchor="end">SPECIAL EDITION · ALL SUSPECTS · FREE TO PLAY</text>
    <text x="${W / 2}" y="350" ${HEAD} font-size="250" fill="${RED}" text-anchor="middle" transform="translate(9 9)">THE LINEUP</text>
    <text x="${W / 2}" y="350" ${HEAD} font-size="250" fill="${INK}" text-anchor="middle">THE LINEUP</text>
    <g transform="rotate(-1.5 ${W / 2} 410)"><rect x="560" y="372" width="1280" height="68" fill="${RED}" stroke="${INK}" stroke-width="5"/>
    <text x="${W / 2}" y="420" ${TYPE} font-size="38" fill="${PAPER}" text-anchor="middle">ONE OF THESE SUSPECTS IS LYING.</text></g>
    <rect x="100" y="460" width="2200" height="740" fill="${PAPER}" fill-opacity=".55" stroke="${INK}" stroke-width="6"/>
    ${wall}${cast}
    <rect y="1240" width="${W}" height="110" fill="${YELLOW}" stroke="${INK}" stroke-width="6"/><rect y="1240" width="${W}" height="110" fill="url(#hy)"/>
    ${maskMark(60, 1258, 120)}
    <text x="200" y="1318" ${HEAD} font-size="58" fill="${INK}">ONCE A LIAR</text>
    <text x="${W - 60}" y="1312" ${TYPE} font-size="36" fill="${INK}" text-anchor="end">The party game where someone's lying.</text>`;
  return doc(W, H, body);
}

function stickerSheet() {
  const S = 2048;
  const ids = ALL_AVATARS as readonly string[];
  const cols = 6;
  const rows = Math.ceil(ids.length / cols);
  const cw = S / cols;
  const rh = (S - 60) / rows;
  let body = `<defs>${halftone('h', INK, 0.14, 22, 3.2)}</defs><rect width="${S}" height="${S}" fill="${YELLOW}"/><rect width="${S}" height="${S}" fill="url(#h)"/>`;
  ids.forEach((id, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const size = Math.min(cw, rh) * 0.96;
    const x = c * cw + (cw - size) / 2;
    const y = 30 + r * rh + (rh - size) / 2;
    const rot = ((i * 37) % 13) - 6;
    body += `<g transform="rotate(${rot} ${x + size / 2} ${y + size / 2})">${place(id, x, y, size, { color: PLAYER_COLORS[(i * 7) % PLAYER_COLORS.length], sticker: true })}</g>`;
  });
  return doc(S, S, body);
}

function ogImage() {
  const W = 1200;
  const H = 630;
  const body = `<defs>${halftone('h', INK, 0.12, 16, 2.4)}</defs>
    <rect width="${W}" height="${H}" fill="${YELLOW}"/><rect width="${W}" height="${H}" fill="url(#h)"/>
    <rect x="0" y="0" width="${W}" height="18" fill="${INK}"/><rect x="0" y="${H - 18}" width="${W}" height="18" fill="${INK}"/>
    ${maskMark(64, 92, 150)}
    <text x="236" y="168" ${HEAD} font-size="64" fill="${INK}">ONCE A</text>
    <text x="66" y="372" ${HEAD} font-size="230" fill="${RED}" transform="translate(8 8)">LIAR</text>
    <text x="66" y="372" ${HEAD} font-size="230" fill="${INK}">LIAR</text>
    <g transform="rotate(-2 330 460)"><rect x="56" y="420" width="560" height="76" fill="${INK}"/>
    <text x="336" y="470" ${TYPE} font-size="34" fill="${PAPER}" text-anchor="middle">The party game where</text></g>
    <g transform="rotate(-2 330 540)"><rect x="96" y="500" width="480" height="64" fill="${RED}" stroke="${INK}" stroke-width="4"/>
    <text x="336" y="543" ${TYPE} font-size="34" fill="${PAPER}" text-anchor="middle">someone's lying.</text></g>
    ${place('duck', 610, 250, 320, { color: 'orchid', sticker: true })}
    ${place('cow', 880, 270, 310, { color: 'coral', sticker: true })}
    ${place('chancla', 770, 0, 320, { color: 'sky', sticker: true, mood: 'idle' })}`;
  return doc(W, H, body);
}

/* ------------------------------------------------------------------ run */

async function main() {
  const CH = topicDir('characters');
  const PROMO = topicDir('promo-art');
  const ICON = topicDir('app-icon');
  for (const d of [CH, PROMO, ICON]) mkdirSync(d, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const readme = (what: string) => `${what}\n\nGenerated ${today} by \`npm run assets\` (tools/assets/export-characters.tsx in the Once a Liar repo).\nSource art: client/src/components/avatars/*.tsx. Re-run the command to regenerate; do not hand-edit.\n`;
  const ids = ALL_AVATARS as readonly string[];
  const sizes: Record<string, number> = {};

  for (const id of ids) {
    const svg = characterSvg(id, { sticker: true });
    out(`svg/${id}.svg`, svg, CH);
    sizes[id] = Buffer.byteLength(characterSvg(id));
    const p1024 = await png(rasterize(svg, 1024));
    out(`png/${id}-1024.png`, p1024, CH);
    const p512 = rasterize(svg, 512);
    out(`png/${id}-512.png`, await png(p512), CH);
    out(`webp/${id}-512.webp`, await sharp(p512).webp({ quality: 86, alphaQuality: 90 }).toBuffer(), CH);
  }
  for (const id of AVATARS as readonly string[]) {
    for (const mood of MOODS) out(`moods/${id}-${mood}-512.png`, await png(rasterize(characterSvg(id, { mood, sticker: true }), 512)), CH);
  }

  out('lineup-poster.png', await png(rasterize(lineupPoster(), 2400)), PROMO);
  out('sticker-sheet.png', await png(rasterize(stickerSheet(), 2048)), PROMO);
  const og = rasterize(ogImage(), 1200);
  out('og-image.png', await png(og), PROMO);

  const icon = iconSvg();
  const iconMaskable = iconSvg(0.66);
  const icon1024 = rasterize(icon, 1024);
  out('icon-1024.png', await png(icon1024), ICON);
  for (const s of [512, 192, 180, 32]) out(`icon-${s}.png`, await png(rasterize(icon, s)), ICON);
  out('icon-maskable-512.png', await png(rasterize(iconMaskable, 512)), ICON);
  out('icon.svg', icon, ICON);

  out('README.txt', readme(`Once a Liar character art (${ids.length} characters, default colour sky, white die-cut sticker halo).
svg/<id>.svg            standalone SVG
png/<id>-512.png, -1024 transparent PNG
webp/<id>-512.webp      transparent WebP for the web/landing page
moods/<id>-<mood>-512.png  idle|sus|caught|win for the ${AVATARS.length} free characters`), CH);
  out('README.txt', readme(`Once a Liar promo art.
lineup-poster.png  2400x1350  "The Lineup" newspaper poster of the free cast
sticker-sheet.png  2048x2048  every character as a die-cut sticker on halftone yellow
og-image.png       1200x630   social share card (repo copy: client/public/og-image.png, palette-compressed)`), PROMO);
  out('README.txt', readme(`Once a Liar app icon: red spy mask on halftone yellow (chosen for 32px legibility).
icon-1024.png master, icon-512/192/180/32.png, icon-maskable-512.png (art in the 66% safe zone), icon.svg.
Repo copies (palette-compressed): client/public/icon-512.png, icon-192.png, apple-touch-icon.png, icon-maskable-512.png, icon.svg, icon-maskable.svg.`), ICON);

  if (REPO) {
    const pub = join(ROOT, 'client/public');
    out('og-image.png', await smallPng(og, 96), pub);
    out('icon-512.png', await smallPng(rasterize(icon, 512), 48), pub);
    out('icon-192.png', await smallPng(rasterize(icon, 192), 48), pub);
    out('apple-touch-icon.png', await smallPng(rasterize(icon, 180), 48), pub);
    out('icon-maskable-512.png', await smallPng(rasterize(iconMaskable, 512), 48), pub);
    out('icon.svg', icon, pub);
    out('icon-maskable.svg', iconMaskable, pub);
  }

  // report
  const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
  const total = written.reduce((a, f) => a + f.bytes, 0);
  console.log(`Wrote ${written.length} files (${kb(total)}) to ${CH}, ${PROMO}, ${ICON}${REPO ? ' + repo' : ''}`);
  for (const f of written.filter((f) => !/\/(png|webp|moods|svg)\//.test(f.path))) console.log(`  ${kb(f.bytes).padStart(9)}  ${f.path}`);
  const big = Object.entries(sizes).sort((a, b) => b[1] - a[1]);
  console.log(`Inline SVG per character (no halo): max ${big[0][0]} ${kb(big[0][1])}, avg ${kb(big.reduce((a, [, n]) => a + n, 0) / big.length)}`);
  console.log(`characters/: ${readdirSync(join(CH, 'png')).length} png, ${readdirSync(join(CH, 'moods')).length} mood png`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
