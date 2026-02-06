# Zid API Integration Documentation

This document describes all Zid API endpoints used by the Raff platform, their expected responses, and error handling.

## Table of Contents

- [Authentication](#authentication)
- [Products API](#products-api)
- [Categories API](#categories-api)
- [Orders API](#orders-api)
- [Store API](#store-api)
- [Webhooks API](#webhooks-api)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

## Authentication

### OAuth 2.0 Flow

**Authorization Endpoint**: `https://oauth.zid.sa/oauth/authorize`
**Token Endpoint**: `https://oauth.zid.sa/oauth/token`

#### Start Authorization

```
GET /oauth/authorize
Query Parameters:
  - client_id: Your Zid app client ID
  - redirect_uri: Your callback URL (must match registered URL)
  - response_type: "code"
  - scope: Space-separated list (e.g., "products.read orders.read")
  - state: CSRF protection token
```

#### Exchange Code for Token

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

Body:
  - grant_type: "authorization_code"
  - code: Authorization code from callback
  - client_id: Your Zid app client ID
  - client_secret: Your Zid app client secret
  - redirect_uri: Same URL used in authorization

Response:
{
  "Authorization": "Bearer xxx",   // Bearer token for API calls
  "access_token": "yyy",           // Manager token for API calls
  "refresh_token": "zzz",
  "token_type": "Bearer",
  "expires_in": 31536000,
  "store_id": "store-123",
  "store_url": "https://store.zid.store"
}
```

> **Important**: Zid returns **two tokens** — `Authorization` (Bearer token) and `access_token` (Manager token). Both are required for all API requests.

#### Refresh Access Token

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

Body:
  - grant_type: "refresh_token"
  - refresh_token: Stored refresh token
  - client_id: Your Zid app client ID
  - client_secret: Your Zid app client secret
  - redirect_uri: Same callback URL (required for Zid)

Response: Same as token exchange
```

> **Note**: Unlike Salla, Zid requires the `redirect_uri` in refresh token requests.

**Error Handling**:
- `invalid_client`: Invalid client credentials
- `invalid_grant`: Invalid or expired refresh token → Merchant needs to reconnect
- `unauthorized_client`: Client not authorized for this grant type

### Request Headers

All authenticated Zid API requests require three headers:

```
Authorization: Bearer {authorization_token}
X-Manager-Token: {access_token}
Access-Token: {access_token}
```

Additionally, most endpoints require a `Store-Id` header:

```
Store-Id: {store_id}
```

> **Exception**: The `/managers/account/profile` endpoint does not require `Store-Id`.

## Products API

### List Products

```
GET https://api.zid.sa/v1/products/
Headers:
  - Authorization: Bearer {token}
  - X-Manager-Token: {manager_token}
  - Access-Token: {manager_token}
  - Store-Id: {store_id}

Query Parameters:
  - page: Page number (default: 1)
  - page_size: Items per page (default: 50)
  - extended: "true" to include variants
  - ordering: "updated_at" or "created_at"

Response:
{
  "results": [
    {
      "id": 123456,
      "name": "Product Name",         // string or { en: "...", ar: "..." }
      "short_description": "...",      // string or { en: "...", ar: "..." }
      "description": "...",            // string or { en: "...", ar: "..." }
      "price": 99.99,
      "sale_price": 79.99,
      "compare_price": 99.99,
      "currency": "SAR",
      "sku": "SKU123",
      "is_published": true,
      "is_infinite": false,
      "quantity": 10,
      "stocks": [
        {
          "available_quantity": 10
        }
      ],
      "images": [
        {
          "url": "https://media.zid.store/image.jpg",
          "alt": "Product image"
        }
      ],
      "categories": [
        {
          "id": 789,
          "name": "Category Name"
        }
      ],
      "slug": "product-name",
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z"
    }
  ],
  "next": "https://api.zid.sa/v1/products/?page=2&page_size=50",
  "previous": null,
  "count": 150
}
```

### Get Product Details

```
GET https://api.zid.sa/v1/products/{product_id}/
Headers: Same as above

Response:
{
  "id": 123456,
  // Same structure as product in list, with additional details
  "options": [...],
  "variants": [...],
  "metadata": {...}
}
```

### Product Data Notes

- **Name/Description**: Can be a plain string or an i18n object `{ en: "English", ar: "عربي" }`
- **Price Priority**: `sale_price` → `price` → `0`
- **Stock Calculation**: If `is_infinite = true`, stock is unlimited. Otherwise, sum `stocks[].available_quantity`
- **Active Status**: `is_published = true` or `status` in `["active", "published", "available"]`

## Categories API

### List Categories

```
GET https://api.zid.sa/v1/managers/store/categories
Headers: Same as products

Response:
{
  "results": [
    {
      "id": 789,
      "name": "Category Name",
      "slug": "category-name",
      "parent_id": null,
      "products_count": 25
    }
  ]
}
```

### Get Category Details

```
GET https://api.zid.sa/v1/managers/store/categories/{category_id}/view
Headers: Same as products

Response:
{
  "id": 789,
  "name": "Category Name",
  "slug": "category-name",
  "description": "Category description",
  "parent_id": null,
  "image": "https://media.zid.store/category.jpg"
}
```

## Orders API

### List Orders

```
GET https://api.zid.sa/v1/managers/store/orders
Headers: Same as products

Query Parameters:
  - payload_type: "default" (REQUIRED — includes products in response)
  - page: Page number
  - per_page: Items per page
  - date_from: Filter from date (YYYY-MM-DD)
  - date_to: Filter to date (YYYY-MM-DD)
  - order_status: Filter by status

Response:
{
  "results": [
    {
      "id": 456789,
      "order_number": "ORD-2024-001",
      "status": "pending",
      "order_status": {
        "code": "pending",
        "name": "Pending"
      },
      "payment_status": "paid",
      "payment_method": "credit_card",
      "total": 299.99,
      "currency": "SAR",
      "customer": {
        "name": "Customer Name",
        "email": "customer@example.com",
        "phone": "+966501234567"
      },
      "created_at": "2024-01-15T14:30:00Z",
      "updated_at": "2024-01-15T15:00:00Z"
    }
  ],
  "next": null,
  "previous": null,
  "count": 50
}
```

> **Important**: Always pass `payload_type=default` — without it, order products are not included in the response.

### Get Order Details

```
GET https://api.zid.sa/v1/managers/store/orders/{order_id}/view
Headers: Same as products

Response:
{
  "id": 456789,
  "order_number": "ORD-2024-001",
  "status": "pending",
  "order_status": {
    "code": "pending",
    "name": "Pending"
  },
  "payment_status": "paid",
  "total": 299.99,
  "currency": "SAR",
  "products": [
    {
      "id": 123456,
      "name": "Product Name",
      "quantity": 2,
      "price": 99.99
    }
  ],
  "shipping": {
    "address": "123 Street Name",
    "city": "Riyadh",
    "country": "Saudi Arabia"
  },
  "created_at": "2024-01-15T14:30:00Z"
}
```

## Store API

### Get Store/Manager Profile

```
GET https://api.zid.sa/v1/managers/account/profile
Headers:
  - Authorization: Bearer {token}
  - X-Manager-Token: {manager_token}
  - Access-Token: {manager_token}
  (No Store-Id header needed)

Response:
{
  "user": {
    "id": "user-123",
    "name": "Manager Name",
    "email": "manager@example.com"
  },
  "store": {
    "id": "store-123",
    "name": "Store Name",
    "url": "https://store.zid.store",
    "currency": "SAR",
    "country": "SA"
  }
}
```

## Webhooks API

### Register Webhook

```
POST https://api.zid.sa/v1/managers/webhooks
Headers:
  - Authorization: Bearer {token}
  - X-Manager-Token: {manager_token}
  - Content-Type: application/json

Body:
{
  "url": "https://yourapp.com/api/zid/webhook",
  "event": "product.create",
  "app_id": "your-app-id"
}

Response:
{
  "id": "webhook-id-123",
  "url": "https://yourapp.com/api/zid/webhook",
  "event": "product.create",
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Webhook Events**:
- `product.create` — New product added
- `product.update` — Product modified
- `product.publish` — Product published
- `product.delete` — Product removed
- `order.create` — New order placed
- `order.status.update` — Order status changed
- `order.payment_status.update` — Payment status changed

## Error Codes

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Refresh access token or reauth |
| 403 | Forbidden | Check app permissions/scopes |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limited | Back off and retry with delay |
| 500 | Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Retry later |

### Common Error Response

```json
{
  "error": {
    "code": "invalid_parameters",
    "message": "The provided parameters are invalid"
  }
}
```

### Scope Errors

If you get a `403` error, check if the required scope is granted:
- `products.read` — Required for product sync
- `orders.read` — Required for order sync
- `categories.read` — Required for category sync
- `webhooks.read` / `webhooks.write` — Required for webhook management

## Rate Limiting

Zid enforces **60 requests per minute per store**.

### Handling 429 Errors

When you receive a `429 Too Many Requests`:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

**Best Practices**:
1. Respect the `Retry-After` header
2. Implement exponential backoff
3. Don't retry more than 2–3 times
4. Use pagination with reasonable `page_size` values (max 50)

### Example Retry Logic

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get("retry-after");
  const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000;

  await sleep(delayMs);
  // Retry request
}
```

## Key Differences from Salla

| Feature | Zid | Salla |
|---------|-----|-------|
| Auth Tokens | Two tokens required (Bearer + Manager) | Single Bearer token |
| Store ID | Sent via `Store-Id` header | Included in payload |
| Pagination | `next`/`previous` URLs, `count` | `pagination` object with `totalPages` |
| Product Names | Can be i18n objects `{ en, ar }` | Always strings |
| Stock Model | `is_infinite` flag + `stocks[]` array | Simpler `quantity` field |
| Order Query | Requires `payload_type=default` | Products included by default |
| Webhook Signature | Default: plain comparison | Default: HMAC-SHA256 |
| Token Refresh | Requires `redirect_uri` | Does not require `redirect_uri` |
| Rate Limit | 60 req/min per store | Varies by endpoint |

## Best Practices

1. **Send both tokens**: Always include `Authorization`, `X-Manager-Token`, and `Access-Token` headers
2. **Use `extended=true`**: When listing products, include extended data for full details
3. **Use `payload_type=default`**: For orders, always include this parameter
4. **Handle i18n fields**: Product names and descriptions may be objects or strings
5. **Handle token expiry**: Implement automatic token refresh on 401 errors
6. **Respect rate limits**: Stay within 60 req/min per store
7. **Use pagination**: Don't request all data at once — paginate with `page_size=50`
8. **Log all errors**: Use structured logging for debugging API issues

## Testing

### Sandbox Environment

- **Auth URL**: `https://oauth.zid.sa/oauth/authorize`
- **API Base**: `https://api.zid.sa/v1`
- **Developer Portal**: https://web.zid.sa/

### Webhook Testing

Use tools like ngrok to test webhooks locally:
```bash
ngrok http 3000
# Use the ngrok URL as your webhook callback
```

## Support

- **Developer Portal**: https://web.zid.sa/
- **API Documentation**: https://docs.zid.sa/
- **Support**: Contact Zid Partner Support
