import React from 'react';

const paths: Record<string, React.ReactNode> = {
  volume: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.8" />
      <circle cx="12" cy="17.2" r=".6" fill="currentColor" />
    </>
  ),
  menu: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="3" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1.2" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1.2" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1.2" />
      <path d="M14.5 14.5h2.5v2.5M20.5 14.5v6h-3M14.5 20.5v-2" />
    </>
  ),
  crown: <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  door: (
    <>
      <path d="M14 4H6v16h8" />
      <path d="M11 12h10M17.5 8.5 21 12l-3.5 3.5" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8 14.5a5 5 0 0 0 8 0" />
      <circle cx="9" cy="10" r=".9" fill="currentColor" />
      <circle cx="15" cy="10" r=".9" fill="currentColor" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.4-2-.5-1.2.3-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 7 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
      <circle cx="10" cy="7" r="1.2" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1.2" fill="currentColor" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  skip: (
    <>
      <path d="M5 5l9 7-9 7z" />
      <path d="M18 5v14" />
    </>
  ),
  send: <path d="M4 12l16-8-6 16-2.5-6.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, title }: { name: IconName; size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}
