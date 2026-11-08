import React from 'react';
import type { Player } from '@oncealiar/shared';
import { Avatar, type AvatarProps } from './Avatar';
import { Icon } from './Icon';
import { colorVar } from '../lib/profile';
import { PresenceBadge } from './Overlays';
import './PlayerTile.css';

interface Props {
  player: Player;
  isYou?: boolean;
  badge?: 'ready' | 'voted' | null;
  selected?: boolean;
  onClick?: () => void;
  onKick?: () => void;
  disabled?: boolean;
  size?: 'md' | 'sm';
  sub?: React.ReactNode;
  stamp?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** idle loop on the character (lobby) */
  animated?: boolean;
  mood?: AvatarProps['mood'];
  /** small one-liner under the name (e.g. character name) */
  alias?: React.ReactNode;
}

export function PlayerTile({ player, isYou, badge, selected, onClick, onKick, disabled, size = 'md', sub, stamp, ariaLabel, style, children, animated, mood, alias }: Props) {
  const Tag = onClick ? 'button' : 'div';
  // away = in another app but still in the game (soft dim); offline = gone (greyed out)
  const presence = player.presence ?? (player.connected ? 'online' : 'offline');
  return (
    <div className={`ptile-wrap ptile-wrap--${size}`} style={style}>
      <Tag
        className={`ptile ${selected ? 'is-selected' : ''} ${presence === 'offline' ? 'is-away' : ''} ${presence === 'away' ? 'is-texting' : ''}`}
        style={{ ['--pc' as string]: colorVar(player.color) }}
        onClick={onClick}
        disabled={onClick ? disabled : undefined}
        aria-pressed={onClick ? !!selected : undefined}
        aria-label={ariaLabel}
      >
        <span className="ptile__photo lineup-bg">
          <span className="ptile__disc">
            <Avatar avatar={player.avatar} color={player.color} size="100%" label="" animated={animated} mood={mood} />
          </span>
        </span>
        <span className="ptile__plate">
          <span className="ptile__name">
            {player.name}
            {isYou && <span className="ptile__you">you</span>}
          </span>
          {alias && <span className="ptile__alias">{alias}</span>}
          {sub && <span className="ptile__sub">{sub}</span>}
        </span>
        {player.isHost && (
          <span className="ptile__crown" title="Host" aria-label="Host">
            <Icon name="crown" size={14} />
          </span>
        )}
        {badge && (
          <span className={`ptile__badge ptile__badge--${badge}`} aria-label={badge === 'ready' ? 'Ready' : 'Voted'}>
            <Icon name="check" size={14} />
          </span>
        )}
        {presence === 'offline' && <span className="ptile__away">offline</span>}
        {presence === 'away' && <PresenceBadge presence="away" className="ptile__presence" compact={size === 'sm'} />}
        {stamp && <span className="ptile__stamp display">{stamp}</span>}
        {children}
      </Tag>
      {onKick && (
        <button className="ptile__kick" onClick={onKick} aria-label={`Remove ${player.name}`}>
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
