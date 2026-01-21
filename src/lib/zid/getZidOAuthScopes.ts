type OptionalString = string | undefined | null;

export const ALLOWED_ZID_SCOPES = new Set([
  "account.read",
  "account.write",
  "vats.read",
  "vats.write",
  "categories.read",
  "categories.write",
  "customers.read",
  "customers.write",
  "orders.read",
  "orders.write",
  "coupons.read",
  "coupons.write",
  "delivery_options.read",
  "delivery_options.write",
  "abandoned_carts.read",
  "abandoned_carts.write",
  "payments.read",
  "payments.write",
  "products.read",
  "products.write",
  "webhooks.read",
  "webhooks.write",
  "countries_cities.read",
  "countries_cities.write",
  "catalog.read",
  "catalog.write",
  "subscriptions.read",
  "subscriptions.write",
  "inventory.read",
  "inventory.write",
  "extra_addons.read",
  "extra_addons.write",
  "bundle_offers.read",
  "bundle_offers.write",
  "order_create.read",
  "order_create.write",
  "product_inventory_stock.read",
  "product_inventory_stock.write",
  "embedded_apps.read",
  "embedded_apps.write",
  "loyalty.read",
  "loyalty.write",
]);

const parseScopes = (value: OptionalString): string[] => {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
};

export const parseZidOAuthScopes = (): {
  scopes: string[];
  invalid: string[];
} => {
  const scopes = parseScopes(process.env.ZID_OAUTH_SCOPES);
  const invalid = scopes.filter((scope) => !ALLOWED_ZID_SCOPES.has(scope));
  return { scopes, invalid };
};

export const getZidOAuthScopes = (): string[] => {
  return parseZidOAuthScopes().scopes;
};
