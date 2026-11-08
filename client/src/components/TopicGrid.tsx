import React from 'react';
import './TopicGrid.css';

interface Props {
  words: string[];
  highlight?: string | null;
  selectable?: boolean;
  selected?: string | null;
  onSelect?: (w: string) => void;
  compact?: boolean;
  /** decorative "scanning" shimmer for the suspense screen */
  scanning?: boolean;
  label?: string;
}

export function TopicGrid({ words, highlight, selectable, selected, onSelect, compact, scanning, label = 'Topic words' }: Props) {
  return (
    <div className={`tgrid ${compact ? 'tgrid--compact' : ''} ${scanning ? 'tgrid--scan' : ''}`} role={selectable ? 'radiogroup' : 'list'} aria-label={label}>
      {words.map((w, i) => {
        const isHi = !!highlight && w === highlight;
        const isSel = selected === w;
        const cls = `tgrid__cell ${isHi ? 'is-secret' : ''} ${isSel ? 'is-selected' : ''}`;
        const style = { animationDelay: `${i * 18}ms`, ['--i' as string]: i } as React.CSSProperties;
        return selectable ? (
          <button key={w} className={cls} style={style} role="radio" aria-checked={isSel} onClick={() => onSelect?.(w)}>
            {w}
          </button>
        ) : (
          <div key={w} className={cls} style={style} role="listitem" aria-label={isHi ? `${w} (codeword)` : w}>
            {w}
          </div>
        );
      })}
    </div>
  );
}
