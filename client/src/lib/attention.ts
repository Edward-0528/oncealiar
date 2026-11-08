/**
 * Getting a backgrounded player's attention: tab title + (opt-in) local notification.
 * Permission is only ever requested from an explicit tap (see NotifyPrompt in Overlays).
 */
export const BASE_TITLE = 'Once a Liar';
let savedTitle: string | null = null;

export function flagTitle(text: string): void {
  if (typeof document === 'undefined') return;
  if (savedTitle === null) savedTitle = document.title;
  document.title = `${text} — ${BASE_TITLE}`;
}

export function restoreTitle(): void {
  if (typeof document === 'undefined' || savedTitle === null) return;
  document.title = savedTitle;
  savedTitle = null;
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported';

export async function requestNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

const TAG = 'oal-turn';

/** Show a local notification (via the service worker when there is one, so it works on Android). */
export async function notify(title: string, body: string): Promise<void> {
  if (notificationPermission() !== 'granted') return;
  const opts: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    tag: TAG,
    renotify: true,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [80, 50, 80]
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    /* ignore */
  }
}

export async function clearNotifications(): Promise<void> {
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    const list = reg ? await reg.getNotifications({ tag: TAG }) : [];
    list.forEach((n) => n.close());
  } catch {
    /* ignore */
  }
}
