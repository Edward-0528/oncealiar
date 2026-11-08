/** Short deep link: `https://host/ABCD` (the server serves the SPA for any 4-letter path). */
export function inviteUrl(code: string) {
  return `${window.location.origin}/${encodeURIComponent(code)}`;
}

/** What to print under a QR / say out loud: `host/ABCD` without the scheme. */
export function shortInviteUrl(code: string) {
  return `${window.location.host}/${code}`;
}

/** Read-only big-screen lobby for a TV / laptop: `https://host/?tv=ABCD`. */
export function tvUrl(code: string) {
  return `${window.location.origin}/?tv=${encodeURIComponent(code)}`;
}

/** Ready-made Web Share payload for inviting friends. */
export function inviteShareData(code: string) {
  return {
    title: 'Once a Liar',
    text: `🕵️ One of us is lying. Join my Once a Liar game — tap the link (room ${code}), no app needed:`,
    url: inviteUrl(code)
  };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Web Share when available, clipboard otherwise. */
export async function shareOrCopy(data: { title: string; text: string; url?: string }): Promise<'shared' | 'copied' | 'failed' | 'cancelled'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  const ok = await copyText(data.url ? `${data.text} ${data.url}` : data.text);
  return ok ? 'copied' : 'failed';
}
