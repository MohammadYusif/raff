# Salla API Integration Documentation

This document describes all Salla API endpoints used by the Raff platform, their expected responses, and error handling.

## Table of Contents

- [Authentication](#authentication)
- [Products API](#products-api)
- [Orders API](#orders-API)
- [Store API](#store-api)
- [Webhooks API](#webhooks-api)
- [Error Codes](#error-codes)
- [Rate Limiting](#rate-limiting)

## Authentication

### OAuth 2.0 Flow

**Authorization Endpoint**: `https://accounts.salla.sa/oauth2/auth`
**Token Endpoint**: `https://accounts.salla.sa/oauth2/token`

#### Start Authorization

```
GET /oauth2/auth
Query Parameters:
  - client_id: Your Salla app client ID
  - redirect_uri: Your callback URL (must match registered URL)
  - response_type: "code"
  - scope: Space-separated list (e.g., "offline_access products.read orders.read")
  - state: CSRF protection token
```

#### Exchange Code for Token

```
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

Body:
  - grant_type: "authorization_code"
  - code: Authorization code from callback
  - client_id: Your Salla app client ID
  - client_secret: Your Salla app client secret
  - redirect_uri: Same URL used in authorization

Response:
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "Bearer",
  "expires_in": 31536000 // seconds
}
```

#### Refresh Access Token

```
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

Body:
  - grant_type: "refresh_token"
  - refresh_token: Stored refresh token
  - client_id: Your Salla app client ID
  - client_secret: Your Salla app client secret

Response: Same as token exchange
```

**Error Handling**:
- `invalid_client`: Invalid client credentials
- `invalid_grant`: Invalid or expired refresh token → Merchant needs to reconnect
- `unauthorized_client`: Client not authorized for this grant type

## Products API

### List Products

```
GET https://api.salla.dev/admin/v2/products
Headers:
  - Authorization: Bearer {access_token}
  - Accept: application/json

Query Parameters:
  - page: Page number (default: 1)
  - per_page: Items per page (default: 15, max: 50)

Response:
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "name": "Product Name",
      "description": "Product description",
      "price": 99.99,
      "sale_price": null,
      "sku": "SKU123",
      "status": "active",
      "quantity": 10,
      "url": "https://store.salla.sa/product/123456",
      "images": [
        {
          "url": "https://cdn.salla.sa/image.jpg",
          "alt": "Product image"
        }
      ],
      "categories": [
        {
          "id": 789,
          "name": "Category Name"
        }
      ],
      "weight": {
        "unit": "kg",
        "value": 1.5
      },
      "created_at": {
        "date": "2024-01-01 12:00:00",
        "timezone": "UTC"
      }
    }
  ],
  "pagination": {
    "count": 50,
    "total": 150,
    "perPage": 50,
    "currentPage": 1,
    "totalPages": 3,
    "links": {
      "next": "https://api.salla.dev/admin/v2/products?page=2",
      "prev": null
    }
  }
}
```

### Get Product Details

```
GET https://api.salla.dev/admin/v2/products/{product_id}
Headers: Same as above

Response:
{
  "success": true,
  "data": {
    // Same structure as product in list, with additional details
    "options": [...],
    "variants": [...],
    "metadata": {...}
  }
}
```

## Orders API

### List Orders

```
GET https://api.salla.dev/admin/v2/orders
Headers: Same as products

Query Parameters:
  - page: Page number
  - per_page: Items per page
  - from_date: Filter orders from date (YYYY-MM-DD)
  - to_date: Filter orders to date (YYYY-MM-DD)
  - status: Filter by status

Response:
{
  "success": true,
  "data": [
    {
      "id": 456789,
      "reference_id": "ORD-2024-001",
      "status": {
        "id": 1,
        "name": "Pending",
        "slug": "pending"
      },
      "payment_method": "credit_card",
      "payment_status": "paid",
      "total": {
        "amount": 299.99,
        "currency": "SAR"
      },
      "date": {
        "date": "2024-01-15 14:30:00",
        "timezone": "Asia/Riyadh"
      }
    }
  ],
  "pagination": {...}
}
```

### Get Order Details

```
GET https://api.salla.dev/admin/v2/orders/{order_id}
Query Parameters:
  - format: "light" (recommended) or "full"

Response:
{
  "success": true,
  "data": {
    "id": 456789,
    "reference_id": "ORD-2024-001",
    "customer": {
      "name": "Customer Name",
      "email": "customer@example.com",
      "phone": "+966501234567"
    },
    "shipping": {
      "address": "123 Street Name",
      "city": "Riyadh",
      "country": "Saudi Arabia",
      "postal_code": "12345"
    },
    "amounts": {
      "sub_total": {...},
      "shipping_cost": {...},
      "tax": {...},
      "total": {...}
    },
    // ... additional fields
  }
}
```

### Get Order Items

```
GET https://api.salla.dev/admin/v2/orders/{order_id}/items

Response:
{
  "success": true,
  "data": [
    {
      "id": 111,
      "product_id": 123456,
      "name": "Product Name",
      "quantity": 2,
      "price": {
        "amount": 99.99,
        "currency": "SAR"
      },
      "sku": "SKU123",
      "options": {...}
    }
  ]
}
```

### Get Order History

```
GET https://api.salla.dev/admin/v2/orders/{order_id}/histories
Query Parameters:
  - per_page: Number of history entries (default: 15)

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 222,
        "status": {...},
        "comment": "Status changed",
        "created_at": "2024-01-15 14:30:00"
      }
    ]
  }
}
```

## Store API

### Get Store Info

```
GET https://api.salla.dev/admin/v2/store/info

Response:
{
  "success": true,
  "data": {
    "id": "store-id-123",
    "name": "Store Name",
    "domain": "store.salla.sa",
    "email": "store@example.com",
    "plan": "premium",
    "status": "active",
    "currency": "SAR",
    "country": "SA"
  }
}
```

## Webhooks API

### Register Webhook

```
POST https://api.salla.dev/admin/v2/webhooks/subscribe
Headers:
  - Authorization: Bearer {access_token}
  - Content-Type: application/json

Body:
{
  "name": "Raff Product Updates",
  "url": "https://yourapp.com/api/salla/webhook",
  "event": "product.created",
  "secret": "your-webhook-secret"
}

Response:
{
  "success": true,
  "data": {
    "id": "webhook-id-123",
    "name": "Raff Product Updates",
    "url": "https://yourapp.com/api/salla/webhook",
    "event": "product.created",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

**Important**: Salla allows only ONE webhook per event. Register separate webhooks for each event:
- `app.installed`
- `app.uninstalled`
- `product.created`
- `product.updated`
- `order.created`
- `order.updated`
- `order.cancelled`
- `order.shipped`

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
  "success": false,
  "error": {
    "code": "invalid_parameters",
    "message": "The provided parameters are invalid",
    "fields": {
      "email": ["Email is required"]
    }
  }
}
```

### Scope Errors

If you get a `403` error, check if the required scope is granted:
- `products.read` - Required for product sync
- `orders.read` - Required for order sync
- `store.read` - Required for store info
- `offline_access` - Required for refresh tokens

## Rate Limiting

Salla API uses rate limiting to prevent abuse.

### Headers

Every response includes rate limit headers:
- `X-RateLimit-Limit`: Total requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Handling 429 Errors

When you receive a `429 Too Many Requests`:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

**Retry-After** can be:
- Number of seconds: `60`
- HTTP date: `Wed, 21 Oct 2025 07:28:00 GMT`

**Best Practices**:
1. Respect the `Retry-After` header
2. Implement exponential backoff
3. Don't retry more than 2-3 times
4. Use concurrent requests sparingly (max 4)

### Example Retry Logic

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get("retry-after");
  const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000;

  await sleep(delayMs);
  // Retry request
}
```

## Best Practices

1. **Use pagination parameters**: Always use `page` and `per_page` for list endpoints
2. **Handle token expiry**: Implement automatic token refresh on 401 errors
3. **Verify webhook signatures**: Always verify HMAC-SHA256 signature for webhooks
4. **Store refresh tokens securely**: Encrypt refresh tokens at rest
5. **Respect rate limits**: Monitor rate limit headers and back off when needed
6. **Use format=light**: For order details, use `format=light` for better performance
7. **Batch operations**: Use batch queries instead of N+1 queries
8. **Log all errors**: Use structured logging for debugging API issues

## Testing

### Sandbox Environment

Salla provides a sandbox environment for testing:
- **Auth URL**: Same as production
- **API Base**: Same as production
- **Test Account**: Create a test store at https://s.salla.sa/

### Webhook Testing

Use tools like ngrok to test webhooks locally:
```bash
ngrok http 3000
# Use the ngrok URL as your webhook callback
```

## Support

- **API Documentation**: https://docs.salla.dev/
- **Developer Portal**: https://salla.dev/
- **Support**: Contact Salla Partner Support

## Changelog

- **2024-01-15**: Updated to API v2 endpoints
- **2024-01-01**: Initial documentation
