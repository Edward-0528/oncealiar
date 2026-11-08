/**
 * Premium unlock hook.
 *
 * Today a room becomes premium when the host enters one of the codes listed in
 * the PREMIUM_CODES env var (comma-separated, case-insensitive).
 *
 * TODO(payments): replace/extend `checkUnlockCode` with a real entitlement
 * check (e.g. verify a Stripe checkout session or app-store receipt server-side
 * and return true when the purchaser owns premium). Keep it async-safe: the
 * socket layer awaits the result.
 */
export function parsePremiumCodes(env: string | undefined): string[] {
  return (env ?? '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

export async function checkUnlockCode(code: unknown, validCodes: string[]): Promise<boolean> {
  if (typeof code !== 'string') return false;
  const c = code.trim().toUpperCase();
  return c.length > 0 && validCodes.includes(c);
}
