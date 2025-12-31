#!/bin/bash

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"

ZID_WEBHOOK_TOKEN="${ZID_WEBHOOK_TOKEN:-}"
ZID_WEBHOOK_URL="${BASE_URL}/api/zid/webhook"
SALLA_WEBHOOK_URL="${BASE_URL}/api/salla/webhook"

ZID_SECRET="${ZID_WEBHOOK_SECRET:-dOQ0pRUGaQXJsDFtc9dWhZJwPcGjpQS0J3akEGKGnVc=}"
SALLA_SECRET="${SALLA_WEBHOOK_SECRET:-mpm6W0DK7mEfQXSoqDHi56FXrTstjDfajptRAcKFuhM=}"

ZID_HEADER="${ZID_WEBHOOK_HEADER:-X-Zid-Webhook-Secret}"
SALLA_HEADER="${SALLA_WEBHOOK_HEADER:-X-Salla-Signature}"
SALLA_SECURITY_HEADER="X-Salla-Security-Strategy"

ZID_SIGNATURE_MODE="${ZID_WEBHOOK_SIGNATURE_MODE:-plain}"
SALLA_SIGNATURE_MODE="${SALLA_WEBHOOK_SIGNATURE_MODE:-sha256}"
SALLA_SECURITY_STRATEGY="${SALLA_WEBHOOK_SECURITY_STRATEGY:-Signature}"

# Test data from seed script
ZID_STORE_ID="${ZID_STORE_ID:-1052373}"
ZID_PRODUCT_ID="${ZID_PRODUCT_ID:-56367672}"
ZID_TRACKING_ID="${ZID_TRACKING_ID:-raff_test_zid_001}"
ZID_TRACKING_ID_EXPIRED="${ZID_TRACKING_ID_EXPIRED:-raff_test_zid_expired}"

SALLA_STORE_ID="${SALLA_STORE_ID:-123456789}"
SALLA_PRODUCT_ID="${SALLA_PRODUCT_ID:-987654321}"
SALLA_TRACKING_ID="${SALLA_TRACKING_ID:-raff_test_salla_001}"
SALLA_TRACKING_ID_EXPIRED="${SALLA_TRACKING_ID_EXPIRED:-raff_test_salla_expired}"

RUN_ID="${RUN_ID:-$(date +%s)}"

ZID_ORDER_001="ZID-ORD-001-${RUN_ID}"
ZID_ORDER_002="ZID-ORD-002-${RUN_ID}"
ZID_ORDER_EXPIRED="ZID-ORD-EXPIRED-${RUN_ID}"
ZID_ORDER_DUPLICATE="ZID-ORD-DUPLICATE-${RUN_ID}"
ZID_ORDER_INVALID="ZID-ORD-INVALID-${RUN_ID}"
ZID_ORDER_MULTI_PREFIX="ZID-ORD-MULTI-${RUN_ID}"

SALLA_ORDER_001="SALLA-ORD-001-${RUN_ID}"
SALLA_ORDER_002="SALLA-ORD-002-${RUN_ID}"
SALLA_ORDER_003="SALLA-ORD-003-${RUN_ID}"
SALLA_ORDER_EXPIRED="SALLA-ORD-EXPIRED-${RUN_ID}"
SALLA_ORDER_DUPLICATE="SALLA-ORD-DUPLICATE-${RUN_ID}"

append_token() {
  local url="$1"
  local token="$2"

  if [ -z "$token" ]; then
    echo "$url"
    return
  fi

  if [[ "$url" == *"?"* ]]; then
    echo "${url}&token=${token}"
  else
    echo "${url}?token=${token}"
  fi
}

calc_signature() {
  local mode="$1"
  local secret="$2"
  local payload="$3"

  case "$mode" in
    plain)
      printf "%s" "$secret"
      ;;
    sha256)
      printf "%s" "${secret}${payload}" | openssl dgst -sha256 -hex | awk '{print $2}'
      ;;
    hmac-sha256)
      printf "%s" "$payload" | openssl dgst -sha256 -hmac "$secret" -hex | awk '{print $2}'
      ;;
    *)
      printf "%s" "$secret"
      ;;
  esac
}

# Function to test webhook
test_webhook() {
  local name="$1"
  local url="$2"
  local header_name="$3"
  local secret="$4"
  local payload="$5"
  local signature_mode="$6"
  local extra_header_name="${7:-}"
  local extra_header_value="${8:-}"

  echo "Testing: ${name}"

  local headers=(-H "Content-Type: application/json")
  if [ -n "$header_name" ] && [ -n "$secret" ]; then
    local signature
    signature=$(calc_signature "$signature_mode" "$secret" "$payload")
    headers+=(-H "${header_name}: ${signature}")
  fi

  if [ -n "$extra_header_name" ] && [ -n "$extra_header_value" ]; then
    headers+=(-H "${extra_header_name}: ${extra_header_value}")
  fi

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "${url}" "${headers[@]}" -d "${payload}")

  local http_code
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -eq 200 ]; then
    echo "  Success (HTTP ${http_code})"
  else
    echo "  Failed (HTTP ${http_code})"
  fi
  echo "  Response: ${body}"
  echo ""
  sleep 1
}

ZID_WEBHOOK_URL="$(append_token "$ZID_WEBHOOK_URL" "$ZID_WEBHOOK_TOKEN")"

echo "========================================"
echo "Raff Webhook Testing Script"
echo "========================================"
echo ""
echo "Configuration:"
echo "Zid Store ID: ${ZID_STORE_ID}"
echo "Zid Product ID: ${ZID_PRODUCT_ID}"
echo "Zid Tracking ID: ${ZID_TRACKING_ID}"
echo "Zid Expired Tracking ID: ${ZID_TRACKING_ID_EXPIRED}"
echo ""
echo "Salla Store ID: ${SALLA_STORE_ID}"
echo "Salla Product ID: ${SALLA_PRODUCT_ID}"
echo "Salla Tracking ID: ${SALLA_TRACKING_ID}"
echo "Salla Expired Tracking ID: ${SALLA_TRACKING_ID_EXPIRED}"
echo ""

# ============================================
# ZID WEBHOOK TESTS
# ============================================

echo "========================================"
echo "Testing Zid Webhooks"
echo "========================================"
echo ""

test_webhook \
  "1. Zid - Product Created" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "product.create",
    "product_id": "'${ZID_PRODUCT_ID}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_PRODUCT_ID}'",
      "title": "New Test Product",
      "price": 99.99,
      "currency": "SAR"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "2. Zid - Product Updated" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "product.update",
    "product_id": "'${ZID_PRODUCT_ID}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_PRODUCT_ID}'",
      "title": "Updated Test Product",
      "price": 149.99,
      "currency": "SAR"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "3. Zid - Product Published" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "product.publish",
    "product_id": "'${ZID_PRODUCT_ID}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_PRODUCT_ID}'",
      "title": "Published Test Product",
      "price": 199.99,
      "currency": "SAR"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "4. Zid - Product Deleted" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "product.delete",
    "product_id": "'${ZID_PRODUCT_ID}'",
    "store_id": "'${ZID_STORE_ID}'"
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "5. Zid - Order Created (No Referrer)" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "order.create",
    "order_id": "'${ZID_ORDER_001}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_ORDER_001}'",
      "total": 250.00,
      "currency": "SAR",
      "payment_status": "pending",
      "status": "pending",
      "created_at": "2025-01-01T10:00:00Z"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "6. Zid - Order Created (With Referrer -> PENDING)" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "order.create",
    "order_id": "'${ZID_ORDER_002}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_ORDER_002}'",
      "total": 300.00,
      "currency": "SAR",
      "referer_code": "'${ZID_TRACKING_ID}'",
      "payment_status": "pending",
      "status": "pending",
      "created_at": "2025-01-01T10:05:00Z"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "7. Zid - Order Payment Confirmed (PENDING -> APPROVED)" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "order.payment_status.update",
    "order_id": "'${ZID_ORDER_002}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_ORDER_002}'",
      "total": 300.00,
      "currency": "SAR",
      "referer_code": "'${ZID_TRACKING_ID}'",
      "payment_status": "paid",
      "status": "confirmed",
      "updated_at": "2025-01-01T10:10:00Z"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "8. Zid - Order Status Update (Delivered)" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "order.status.update",
    "order_id": "'${ZID_ORDER_002}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_ORDER_002}'",
      "total": 300.00,
      "currency": "SAR",
      "referer_code": "'${ZID_TRACKING_ID}'",
      "payment_status": "paid",
      "status": "delivered",
      "updated_at": "2025-01-01T11:00:00Z"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "9. Zid - Order Refunded (APPROVED -> CANCELLED)" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "order.payment_status.update",
    "order_id": "'${ZID_ORDER_002}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_ORDER_002}'",
      "total": 300.00,
      "currency": "SAR",
      "referer_code": "'${ZID_TRACKING_ID}'",
      "payment_status": "refunded",
      "status": "cancelled",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

test_webhook \
  "10. Zid - Order Created (Expired Referrer)" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "${ZID_SECRET}" \
  '{
    "event": "order.create",
    "order_id": "'${ZID_ORDER_EXPIRED}'",
    "store_id": "'${ZID_STORE_ID}'",
    "data": {
      "id": "'${ZID_ORDER_EXPIRED}'",
      "total": 200.00,
      "currency": "SAR",
      "referer_code": "'${ZID_TRACKING_ID_EXPIRED}'",
      "payment_status": "paid",
      "status": "confirmed",
      "created_at": "2025-01-01T12:15:00Z"
    }
  }' \
  "${ZID_SIGNATURE_MODE}"

echo "Testing: 11. Zid - Idempotency (Duplicate Order)"
for i in 1 2; do
  response=$(curl -s -w "\n%{http_code}" -X POST "${ZID_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -H "${ZID_HEADER}: $(calc_signature "$ZID_SIGNATURE_MODE" "$ZID_SECRET" '{
      "event": "order.create",
      "order_id": "'${ZID_ORDER_DUPLICATE}'",
      "store_id": "'${ZID_STORE_ID}'",
      "data": {
        "id": "'${ZID_ORDER_DUPLICATE}'",
        "total": 100.00,
        "currency": "SAR",
        "referer_code": "'${ZID_TRACKING_ID}'",
        "payment_status": "paid",
        "status": "confirmed"
      }
    }')" \
    -d '{
      "event": "order.create",
      "order_id": "'${ZID_ORDER_DUPLICATE}'",
      "store_id": "'${ZID_STORE_ID}'",
      "data": {
        "id": "'${ZID_ORDER_DUPLICATE}'",
        "total": 100.00,
        "currency": "SAR",
        "referer_code": "'${ZID_TRACKING_ID}'",
        "payment_status": "paid",
        "status": "confirmed"
      }
    }')

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ $i -eq 1 ]; then
    echo "  Attempt #1 (HTTP ${http_code}): ${body}"
  else
    echo "  Attempt #2 (HTTP ${http_code}): ${body} (Should be idempotent)"
  fi
done
echo ""

echo "Testing: 12. Zid - Multi-order Same Tracking (3 orders)"
for i in 1 2 3; do
  ZID_ORDER_MULTI_ID="${ZID_ORDER_MULTI_PREFIX}-${i}"
  test_webhook \
    "12.${i}. Zid - Multi-order Same Tracking" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
      "event": "order.create",
      "order_id": "'${ZID_ORDER_MULTI_ID}'",
      "store_id": "'${ZID_STORE_ID}'",
      "data": {
        "id": "'${ZID_ORDER_MULTI_ID}'",
        "total": 120.00,
        "currency": "SAR",
        "referer_code": "'${ZID_TRACKING_ID}'",
        "payment_status": "paid",
        "status": "confirmed",
        "created_at": "2025-01-01T12:30:00Z"
      }
    }' \
    "${ZID_SIGNATURE_MODE}"
done
echo ""

test_webhook \
  "13. Zid - Invalid Signature (Should Fail)" \
  "${ZID_WEBHOOK_URL}" \
  "${ZID_HEADER}" \
  "INVALID_SECRET_123" \
  '{
    "event": "order.create",
    "order_id": "'${ZID_ORDER_INVALID}'"
  }' \
  "${ZID_SIGNATURE_MODE}"

# ============================================
# SALLA WEBHOOK TESTS
# ============================================

echo "========================================"
echo "Testing Salla Webhooks"
echo "========================================"
echo ""

test_webhook \
  "14. Salla - App Authorization" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "app.store.authorize",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'",
      "name": "Test Salla Store",
      "email": "test@salla.sa"
    },
    "data": {
      "access_token": "new-test-token-12345",
      "refresh_token": "new-refresh-token-67890",
      "expires_in": 31536000
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "15. Salla - Product Created" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "product.created",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_PRODUCT_ID}'",
      "name": "New Salla Product",
      "price": {
        "amount": 199.99,
        "currency": "SAR"
      }
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "16. Salla - Product Updated" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "product.updated",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_PRODUCT_ID}'",
      "name": "Updated Salla Product",
      "price": {
        "amount": 249.99,
        "currency": "SAR"
      }
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "17. Salla - Product Published" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "product.published",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_PRODUCT_ID}'",
      "name": "Published Salla Product",
      "price": {
        "amount": 299.99,
        "currency": "SAR"
      }
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "18. Salla - Product Deleted" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "product.deleted",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_PRODUCT_ID}'"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "19. Salla - Order Created (No Referrer)" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "order.created",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_ORDER_001}'",
      "total": {
        "amount": 350.00,
        "currency": "SAR"
      },
      "payment": {
        "status": "pending"
      },
      "status": {
        "code": "pending"
      },
      "created_at": "2025-01-01T13:00:00Z"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "20. Salla - Order Created (With Referrer -> PENDING)" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "order.created",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_ORDER_002}'",
      "total": {
        "amount": 400.00,
        "currency": "SAR"
      },
      "referrer": "'${SALLA_TRACKING_ID}'",
      "payment": {
        "status": "pending"
      },
      "status": {
        "code": "pending"
      },
      "created_at": "2025-01-01T13:05:00Z"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "21. Salla - Order Paid (PENDING -> APPROVED)" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "order.paid",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_ORDER_002}'",
      "total": {
        "amount": 400.00,
        "currency": "SAR"
      },
      "referrer": "'${SALLA_TRACKING_ID}'",
      "payment": {
        "status": "paid"
      },
      "status": {
        "code": "confirmed"
      },
      "updated_at": "2025-01-01T13:10:00Z"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "22. Salla - Order Status Updated (Delivered)" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "order.status.updated",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_ORDER_002}'",
      "total": {
        "amount": 400.00,
        "currency": "SAR"
      },
      "referrer": "'${SALLA_TRACKING_ID}'",
      "payment": {
        "status": "paid"
      },
      "status": {
        "code": "delivered"
      },
      "updated_at": "2025-01-01T14:00:00Z"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "23. Salla - Order Cancelled (APPROVED -> CANCELLED)" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "order.cancelled",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_ORDER_002}'",
      "total": {
        "amount": 400.00,
        "currency": "SAR"
      },
      "referrer": "'${SALLA_TRACKING_ID}'",
      "payment": {
        "status": "refunded"
      },
      "status": {
        "code": "cancelled"
      },
      "updated_at": "2025-01-01T14:30:00Z"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "24. Salla - Order Created (Directly Paid -> APPROVED)" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "order.created",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_ORDER_003}'",
      "total": {
        "amount": 550.00,
        "currency": "SAR"
      },
      "referrer": "'${SALLA_TRACKING_ID}'",
      "payment": {
        "status": "paid"
      },
      "status": {
        "code": "confirmed"
      },
      "created_at": "2025-01-01T14:30:00Z"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

test_webhook \
  "25. Salla - Order Created (Expired Referrer)" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "${SALLA_SECRET}" \
  '{
    "event": "order.created",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    },
    "data": {
      "id": "'${SALLA_ORDER_EXPIRED}'",
      "total": {
        "amount": 220.00,
        "currency": "SAR"
      },
      "referrer": "'${SALLA_TRACKING_ID_EXPIRED}'",
      "payment": {
        "status": "paid"
      },
      "status": {
        "code": "confirmed"
      },
      "created_at": "2025-01-01T14:40:00Z"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

echo "Testing: 26. Salla - Idempotency (Duplicate Order)"
for i in 1 2; do
  response=$(curl -s -w "\n%{http_code}" -X POST "${SALLA_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -H "${SALLA_HEADER}: $(calc_signature "$SALLA_SIGNATURE_MODE" "$SALLA_SECRET" '{
      "event": "order.created",
      "merchant": {
        "id": "'${SALLA_STORE_ID}'"
      },
      "data": {
        "id": "'${SALLA_ORDER_DUPLICATE}'",
        "total": {
          "amount": 150.00,
          "currency": "SAR"
        },
        "referrer": "'${SALLA_TRACKING_ID}'",
        "payment": {
          "status": "paid"
        },
        "status": {
          "code": "confirmed"
        }
      }
    }')" \
    -H "${SALLA_SECURITY_HEADER}: ${SALLA_SECURITY_STRATEGY}" \
    -d '{
      "event": "order.created",
      "merchant": {
        "id": "'${SALLA_STORE_ID}'"
      },
      "data": {
        "id": "'${SALLA_ORDER_DUPLICATE}'",
        "total": {
          "amount": 150.00,
          "currency": "SAR"
        },
        "referrer": "'${SALLA_TRACKING_ID}'",
        "payment": {
          "status": "paid"
        },
        "status": {
          "code": "confirmed"
        }
      }
    }')

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ $i -eq 1 ]; then
    echo "  Attempt #1 (HTTP ${http_code}): ${body}"
  else
    echo "  Attempt #2 (HTTP ${http_code}): ${body} (Should be idempotent)"
  fi
done
echo ""

test_webhook \
  "27. Salla - Invalid Signature (Should Fail)" \
  "${SALLA_WEBHOOK_URL}" \
  "${SALLA_HEADER}" \
  "INVALID_SECRET_456" \
  '{
    "event": "order.created",
    "merchant": {
      "id": "'${SALLA_STORE_ID}'"
    }
  }' \
  "${SALLA_SIGNATURE_MODE}" \
  "${SALLA_SECURITY_HEADER}" \
  "${SALLA_SECURITY_STRATEGY}"

# ============================================
# TEST SUMMARY
# ============================================

echo "========================================"
echo "Webhook Testing Complete!"
echo "========================================"
echo ""
echo "Test Summary:"
echo "  Zid Product Events: 4 tests"
echo "  Zid Order Events: 6 tests"
echo "  Zid Edge Cases: 3 tests"
echo "  Salla App Auth: 1 test"
echo "  Salla Product Events: 4 tests"
echo "  Salla Order Events: 7 tests"
echo "  Salla Edge Cases: 2 tests"
echo "  Total: 27 tests"
echo ""
echo "Verification Steps:"
echo "1. Check application logs for webhook processing"
echo "2. Open Prisma Studio: npx prisma studio"
echo "3. Verify tables:"
echo "   - WebhookLog (should have ~27 entries)"
echo "   - Commission (check status transitions and cancellations)"
echo "   - ClickTracking (converted=true for paid orders)"
echo ""
echo "Expected Results:"
echo "  - Product events: 200 OK"
echo "  - Orders without referrer: 200 OK (no commission)"
echo "  - Orders with referrer (pending): PENDING commission"
echo "  - Orders with payment: APPROVED commission"
echo "  - Cancel/refund events: CANCELLED commission"
echo "  - Duplicate webhooks: idempotent (no duplicate commissions)"
echo "  - Invalid signatures: 401 Unauthorized"
echo ""
