const ALLOWED_IMAGE_HOSTS = new Set(['i.postimg.cc', 'i.ibb.co']);

export function isAllowedAdminImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeAllowedAdminImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return isAllowedAdminImageUrl(trimmed) ? trimmed : null;
}
