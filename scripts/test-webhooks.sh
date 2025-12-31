#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
ZID_WEBHOOK_URL="${BASE_URL}/api/zid/webhook"
SALLA_WEBHOOK_URL="${BASE_URL}/api/salla/webhook"
ZID_SECRET="${ZID_WEBHOOK_SECRET:-dOQ0pRUGaQXJsDFtc9dWhZJwPcGjpQS0J3akEGKGnVc=}"
SALLA_SECRET="${SALLA_WEBHOOK_SECRET:-mpm6W0DK7mEfQXSoqDHi56FXrTstjDfajptRAcKFuhM=}"
ZID_HEADER="${ZID_WEBHOOK_HEADER:-X-Zid-Webhook-Secret}"
SALLA_HEADER="${SALLA_WEBHOOK_HEADER:-X-Salla-Webhook-Secret}"

# Test data from seed script
ZID_STORE_ID="${ZID_STORE_ID:-1052373}"
ZID_PRODUCT_ID="${ZID_PRODUCT_ID:-56367672}"
ZID_TRACKING_ID="${ZID_TRACKING_ID:-raff_test_zid_001}"

SALLA_STORE_ID="${SALLA_STORE_ID:-123456789}"
SALLA_PRODUCT_ID="${SALLA_PRODUCT_ID:-987654321}"
SALLA_TRACKING_ID="${SALLA_TRACKING_ID:-raff_test_salla_001}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Raff Webhook Testing Script${NC}"
echo -e "${BLUE}========================================${NC}\n"
echo -e "${YELLOW}Configuration:${NC}"
echo -e "Zid Store ID: ${ZID_STORE_ID}"
echo -e "Zid Product ID: ${ZID_PRODUCT_ID}"
echo -e "Zid Tracking ID: ${ZID_TRACKING_ID}"
echo -e ""
echo -e "Salla Store ID: ${SALLA_STORE_ID}"
echo -e "Salla Product ID: ${SALLA_PRODUCT_ID}"
echo -e "Salla Tracking ID: ${SALLA_TRACKING_ID}\n"

# Function to test webhook
test_webhook() {
    local name=$1
    local url=$2
    local header_name=$3
    local secret=$4
    local payload=$5
    
    echo -e "${YELLOW}▶ Testing: ${name}${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${url}" \
        -H "Content-Type: application/json" \
        -H "${header_name}: ${secret}" \
        -d "${payload}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Success (HTTP ${http_code})${NC}"
        echo -e "Response: ${body}"
    else
        echo -e "${RED}❌ Failed (HTTP ${http_code})${NC}"
        echo -e "Response: ${body}"
    fi
    
    echo -e ""
    sleep 1
}

# ============================================
# ZID WEBHOOK TESTS
# ============================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Testing Zid Webhooks${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Zid Product Created
test_webhook \
    "1. Zid - Product Created" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
        "event": "product.created",
        "product_id": "'${ZID_PRODUCT_ID}'",
        "store_id": "'${ZID_STORE_ID}'",
        "data": {
            "id": "'${ZID_PRODUCT_ID}'",
            "title": "New Test Product",
            "price": 99.99,
            "currency": "SAR"
        }
    }'

# Test 2: Zid Product Updated
test_webhook \
    "2. Zid - Product Updated" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
        "event": "product.updated",
        "product_id": "'${ZID_PRODUCT_ID}'",
        "store_id": "'${ZID_STORE_ID}'",
        "data": {
            "id": "'${ZID_PRODUCT_ID}'",
            "title": "Updated Test Product",
            "price": 149.99,
            "currency": "SAR"
        }
    }'

# Test 3: Zid Product Deleted
test_webhook \
    "3. Zid - Product Deleted" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
        "event": "product.deleted",
        "product_id": "'${ZID_PRODUCT_ID}'",
        "store_id": "'${ZID_STORE_ID}'"
    }'

# Test 4: Zid Order Created (No Referrer)
test_webhook \
    "4. Zid - Order Created (No Referrer)" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
        "event": "order.created",
        "order_id": "ZID-ORD-001",
        "store_id": "'${ZID_STORE_ID}'",
        "data": {
            "id": "ZID-ORD-001",
            "total": 250.00,
            "currency": "SAR",
            "payment_status": "pending",
            "status": "pending",
            "created_at": "2025-01-01T10:00:00Z"
        }
    }'

# Test 5: Zid Order Created (With Referrer - PENDING)
test_webhook \
    "5. Zid - Order Created (With Referrer → PENDING)" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
        "event": "order.created",
        "order_id": "ZID-ORD-002",
        "store_id": "'${ZID_STORE_ID}'",
        "data": {
            "id": "ZID-ORD-002",
            "total": 300.00,
            "currency": "SAR",
            "referer_code": "'${ZID_TRACKING_ID}'",
            "payment_status": "pending",
            "status": "pending",
            "created_at": "2025-01-01T10:05:00Z"
        }
    }'

# Test 6: Zid Order Payment Confirmed (PENDING → APPROVED)
test_webhook \
    "6. Zid - Order Payment Confirmed (PENDING → APPROVED)" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
        "event": "order.payment_status.update",
        "order_id": "ZID-ORD-002",
        "store_id": "'${ZID_STORE_ID}'",
        "data": {
            "id": "ZID-ORD-002",
            "total": 300.00,
            "currency": "SAR",
            "referer_code": "'${ZID_TRACKING_ID}'",
            "payment_status": "paid",
            "status": "confirmed",
            "updated_at": "2025-01-01T10:10:00Z"
        }
    }'

# Test 7: Zid Order Status Update (Delivered)
test_webhook \
    "7. Zid - Order Status Update (Delivered)" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
        "event": "order.status.update",
        "order_id": "ZID-ORD-002",
        "store_id": "'${ZID_STORE_ID}'",
        "data": {
            "id": "ZID-ORD-002",
            "total": 300.00,
            "currency": "SAR",
            "referer_code": "'${ZID_TRACKING_ID}'",
            "payment_status": "paid",
            "status": "delivered",
            "updated_at": "2025-01-01T11:00:00Z"
        }
    }'

# Test 8: Zid Order Created (Directly Paid - APPROVED)
test_webhook \
    "8. Zid - Order Created (Directly Paid → APPROVED)" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "${ZID_SECRET}" \
    '{
        "event": "order.created",
        "order_id": "ZID-ORD-003",
        "store_id": "'${ZID_STORE_ID}'",
        "data": {
            "id": "ZID-ORD-003",
            "total": 450.00,
            "currency": "SAR",
            "referer_code": "'${ZID_TRACKING_ID}'",
            "payment_status": "paid",
            "status": "confirmed",
            "created_at": "2025-01-01T12:00:00Z"
        }
    }'

# Test 9: Zid Idempotency Test (Duplicate Order)
echo -e "${YELLOW}▶ Testing: 9. Zid - Idempotency (Duplicate Order)${NC}"
for i in {1..2}; do
    response=$(curl -s -w "\n%{http_code}" -X POST "${ZID_WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -H "${ZID_HEADER}: ${ZID_SECRET}" \
        -d '{
            "event": "order.created",
            "order_id": "ZID-ORD-DUPLICATE",
            "store_id": "'${ZID_STORE_ID}'",
            "data": {
                "id": "ZID-ORD-DUPLICATE",
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
        echo -e "  Attempt #1: ${GREEN}${body}${NC}"
    else
        echo -e "  Attempt #2: ${BLUE}${body}${NC} (Should be idempotent)"
    fi
done
echo -e ""

# Test 9b: Zid Multiple Orders Same Tracking
echo -e "${YELLOW}?-? Testing: 9b. Zid - Multi-order Same Tracking (3 orders)${NC}"
for i in 1 2 3; do
    test_webhook \
        "9b.${i}. Zid - Multi-order Same Tracking" \
        "${ZID_WEBHOOK_URL}" \
        "${ZID_HEADER}" \
        "${ZID_SECRET}" \
        '{
            "event": "order.created",
            "order_id": "ZID-ORD-MULTI-'${i}'",
            "store_id": "'${ZID_STORE_ID}'",
            "data": {
                "id": "ZID-ORD-MULTI-'${i}'",
                "total": 120.00,
                "currency": "SAR",
                "referer_code": "'${ZID_TRACKING_ID}'",
                "payment_status": "paid",
                "status": "confirmed",
                "created_at": "2025-01-01T12:30:00Z"
            }
        }'
done
echo -e ""

# Test 10: Zid Invalid Signature
test_webhook \
    "10. Zid - Invalid Signature (Should Fail)" \
    "${ZID_WEBHOOK_URL}" \
    "${ZID_HEADER}" \
    "INVALID_SECRET_123" \
    '{
        "event": "order.created",
        "order_id": "ZID-ORD-INVALID"
    }'

# ============================================
# SALLA WEBHOOK TESTS
# ============================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Testing Salla Webhooks${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 11: Salla App Authorization
test_webhook \
    "11. Salla - App Authorization" \
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
    }'

# Test 12: Salla Product Created
test_webhook \
    "12. Salla - Product Created" \
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
    }'

# Test 13: Salla Product Updated
test_webhook \
    "13. Salla - Product Updated" \
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
    }'

# Test 14: Salla Product Deleted
test_webhook \
    "14. Salla - Product Deleted" \
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
    }'

# Test 15: Salla Order Created (No Referrer)
test_webhook \
    "15. Salla - Order Created (No Referrer)" \
    "${SALLA_WEBHOOK_URL}" \
    "${SALLA_HEADER}" \
    "${SALLA_SECRET}" \
    '{
        "event": "order.created",
        "merchant": {
            "id": "'${SALLA_STORE_ID}'"
        },
        "data": {
            "id": "SALLA-ORD-001",
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
    }'

# Test 16: Salla Order Created (With Referrer - PENDING)
test_webhook \
    "16. Salla - Order Created (With Referrer → PENDING)" \
    "${SALLA_WEBHOOK_URL}" \
    "${SALLA_HEADER}" \
    "${SALLA_SECRET}" \
    '{
        "event": "order.created",
        "merchant": {
            "id": "'${SALLA_STORE_ID}'"
        },
        "data": {
            "id": "SALLA-ORD-002",
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
    }'

# Test 17: Salla Order Paid (PENDING → APPROVED)
test_webhook \
    "17. Salla - Order Paid (PENDING → APPROVED)" \
    "${SALLA_WEBHOOK_URL}" \
    "${SALLA_HEADER}" \
    "${SALLA_SECRET}" \
    '{
        "event": "order.paid",
        "merchant": {
            "id": "'${SALLA_STORE_ID}'"
        },
        "data": {
            "id": "SALLA-ORD-002",
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
    }'

# Test 18: Salla Order Status Updated (Delivered)
test_webhook \
    "18. Salla - Order Status Updated (Delivered)" \
    "${SALLA_WEBHOOK_URL}" \
    "${SALLA_HEADER}" \
    "${SALLA_SECRET}" \
    '{
        "event": "order.status.updated",
        "merchant": {
            "id": "'${SALLA_STORE_ID}'"
        },
        "data": {
            "id": "SALLA-ORD-002",
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
    }'

# Test 19: Salla Order Created (Directly Paid - APPROVED)
test_webhook \
    "19. Salla - Order Created (Directly Paid → APPROVED)" \
    "${SALLA_WEBHOOK_URL}" \
    "${SALLA_HEADER}" \
    "${SALLA_SECRET}" \
    '{
        "event": "order.created",
        "merchant": {
            "id": "'${SALLA_STORE_ID}'"
        },
        "data": {
            "id": "SALLA-ORD-003",
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
    }'

# Test 20: Salla Idempotency Test (Duplicate Order)
echo -e "${YELLOW}▶ Testing: 20. Salla - Idempotency (Duplicate Order)${NC}"
for i in {1..2}; do
    response=$(curl -s -w "\n%{http_code}" -X POST "${SALLA_WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -H "${SALLA_HEADER}: ${SALLA_SECRET}" \
        -d '{
            "event": "order.created",
            "merchant": {
                "id": "'${SALLA_STORE_ID}'"
            },
            "data": {
                "id": "SALLA-ORD-DUPLICATE",
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
        echo -e "  Attempt #1: ${GREEN}${body}${NC}"
    else
        echo -e "  Attempt #2: ${BLUE}${body}${NC} (Should be idempotent)"
    fi
done
echo -e ""

# Test 21: Salla Invalid Signature
test_webhook \
    "21. Salla - Invalid Signature (Should Fail)" \
    "${SALLA_WEBHOOK_URL}" \
    "${SALLA_HEADER}" \
    "INVALID_SECRET_456" \
    '{
        "event": "order.created",
        "merchant": {
            "id": "'${SALLA_STORE_ID}'"
        }
    }'

# ============================================
# TEST SUMMARY
# ============================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Webhook Testing Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}✅ All tests executed!${NC}\n"

echo -e "${YELLOW}📊 Test Summary:${NC}"
echo -e "  • Zid Product Events: 3 tests"
echo -e "  • Zid Order Events: 6 tests"
echo -e "  • Zid Edge Cases: 2 tests"
echo -e "  • Salla App Auth: 1 test"
echo -e "  • Salla Product Events: 3 tests"
echo -e "  • Salla Order Events: 5 tests"
echo -e "  • Salla Edge Cases: 2 tests"
echo -e "  ${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}Total: 22 tests${NC}\n"

echo -e "${YELLOW}🔍 Verification Steps:${NC}"
echo -e "1. Check application logs for webhook processing"
echo -e "2. Open Prisma Studio: ${GREEN}npx prisma studio${NC}"
echo -e "3. Verify tables:"
echo -e "   ${BLUE}•${NC} WebhookLog - Should have ~22 entries"
echo -e "   ${BLUE}•${NC} Commission - Check PENDING/ON_HOLD → APPROVED transitions"
echo -e "   ${BLUE}•${NC} ClickTracking - Check converted=true for paid orders"
echo -e ""
echo -e "${YELLOW}📝 Expected Results:${NC}"
echo -e "   ${GREEN}✓${NC} Product events: 200 OK"
echo -e "   ${GREEN}✓${NC} Orders without referrer: 200 OK (no commission)"
echo -e "   ${GREEN}✓${NC} Orders with referrer (pending): PENDING commission"
echo -e "   ${GREEN}✓${NC} Orders with payment: APPROVED or ON_HOLD"
echo -e "   ${GREEN}✓${NC} Duplicate webhooks: Idempotent (no duplicate commissions)"
echo -e "   ${RED}✗${NC} Invalid signatures: 401 Unauthorized"
echo -e ""
echo -e "${GREEN}🎉 Happy testing!${NC}\n"
