const BEARER_PREFIX = /^bearer\s+/i;

export const hasBearerPrefix = (value?: string | null): boolean => {
  if (!value) return false;
  return BEARER_PREFIX.test(value.trim());
};

export const normalizeZidAuthorizationToken = (
  value?: string | null
): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(BEARER_PREFIX, "").trim();
  return normalized || null;
};
