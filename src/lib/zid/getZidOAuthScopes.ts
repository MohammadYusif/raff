type OptionalString = string | undefined | null;

const parseScopes = (value: OptionalString): string[] => {
  if (!value) return [];
  return value
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
};

export const getZidOAuthScopes = (): string[] => {
  return parseScopes(process.env.ZID_OAUTH_SCOPES);
};
