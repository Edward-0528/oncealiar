import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';
import { AvatarArt } from '../../client/src/components/avatars/render';
import type { Mood } from '../../client/src/components/avatars/kit';

/** Player colours (mirror of --pc-* in client/src/styles/tokens.css) so exports are standalone. */
export const PC: Record<string, string> = {
  coral: '#ff6b5e',
  tangerine: '#ff9f43',
  sun: '#ffd23f',
  lime: '#a3e635',
  mint: '#34d8ac',
  sky: '#4cc9f0',
  iris: '#8b8cff',
  orchid: '#c77dff',
  rose: '#ff7eb6',
  slate: '#a3b1c6'
};
export const DEFAULT_COLOR = 'sky';

const FONT_FILES = [
  '/System/Library/Fonts/Supplemental/Impact.ttf',
  '/System/Library/Fonts/Supplemental/Arial Black.ttf',
  '/System/Library/Fonts/Supplemental/Courier New Bold.ttf'
];

/** Minify the markup a little: trim float noise, drop empty attrs. */
export function tidy(svg: string): string {
  return svg
    .replace(/(\d+\.\d{2})\d+/g, '$1')
    .replace(/ (class|role)="[^"]*"/g, '')
    .replace(/>\s+</g, '><');
}

export interface CharOpts {
  color?: string;
  mood?: Mood;
  sticker?: boolean;
  size?: number;
  uid?: string;
}

/** Standalone SVG string for one character. */
export function characterSvg(id: string, o: CharOpts = {}): string {
  const c = PC[o.color ?? DEFAULT_COLOR] ?? o.color ?? PC[DEFAULT_COLOR];
  const markup = renderToStaticMarkup(
    <AvatarArt avatar={id} c={c} uid={o.uid ?? id} mood={o.mood ?? 'idle'} size={o.size ?? 512} sticker={o.sticker} standalone label={id} />
  );
  // the masked overlay uses a CSS var for the accent; resolve it for standalone files
  return tidy(markup.replace(/var\(--accent, (#[0-9A-Fa-f]+)\)/g, '$1'));
}

/** Inner markup of a character svg (for embedding in a bigger composition). */
export function characterInner(id: string, o: CharOpts = {}): { viewBox: string; inner: string } {
  const svg = characterSvg(id, o);
  const viewBox = /viewBox="([^"]+)"/.exec(svg)![1];
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return { viewBox, inner };
}

/** Place a character svg at x,y with width w inside a composition. */
export function place(id: string, x: number, y: number, w: number, o: CharOpts = {}): string {
  const { viewBox, inner } = characterInner(id, { ...o, uid: o.uid ?? `${id}${Math.round(x)}x${Math.round(y)}` });
  return `<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="${viewBox}" overflow="visible">${inner}</svg>`;
}

export function rasterize(svg: string, width: number, background?: string): Buffer {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background,
    font: { fontFiles: FONT_FILES, loadSystemFonts: true, defaultFontFamily: 'Impact' }
  });
  return r.render().asPng();
}
