export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  const trimmed = typeof value === 'string' ? value.trim() : '';
  // Guard against common placeholder values used during scaffolding
  const insecurePlaceholders = new Set([
    'dev_secret',
    'change_me_in_prod',
    'your_strong_jwt_secret_here',
  ]);
  if (!trimmed || insecurePlaceholders.has(trimmed)) {
    throw new Error(`[CONFIG] Missing required env: ${name}`);
  }
  return trimmed;
}

export function getOptionalEnv(name: string, fallback = ''): string {
  const value = process.env[name];
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function getBooleanEnv(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


