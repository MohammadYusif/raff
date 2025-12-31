$baseUrl = $env:BASE_URL
if (-not $baseUrl) {
  $baseUrl = "http://localhost:3000"
}

$zidWebhookToken = $env:ZID_WEBHOOK_TOKEN
$zidWebhookUrl = "$baseUrl/api/zid/webhook"
$sallaWebhookUrl = "$baseUrl/api/salla/webhook"

$zidSecret = $env:ZID_WEBHOOK_SECRET
if (-not $zidSecret) {
  $zidSecret = "dOQ0pRUGaQXJsDFtc9dWhZJwPcGjpQS0J3akEGKGnVc="
}

$sallaSecret = $env:SALLA_WEBHOOK_SECRET
if (-not $sallaSecret) {
  $sallaSecret = "mpm6W0DK7mEfQXSoqDHi56FXrTstjDfajptRAcKFuhM="
}

$zidHeader = $env:ZID_WEBHOOK_HEADER
if (-not $zidHeader) {
  $zidHeader = "X-Zid-Webhook-Secret"
}

$sallaHeader = $env:SALLA_WEBHOOK_HEADER
if (-not $sallaHeader) {
  $sallaHeader = "X-Salla-Signature"
}

$sallaSecurityHeader = "X-Salla-Security-Strategy"

$zidSignatureMode = $env:ZID_WEBHOOK_SIGNATURE_MODE
if (-not $zidSignatureMode) {
  $zidSignatureMode = "plain"
}

$sallaSignatureMode = $env:SALLA_WEBHOOK_SIGNATURE_MODE
if (-not $sallaSignatureMode) {
  $sallaSignatureMode = "sha256"
}

$sallaSecurityStrategy = $env:SALLA_WEBHOOK_SECURITY_STRATEGY
if (-not $sallaSecurityStrategy) {
  $sallaSecurityStrategy = "Signature"
}

$zidStoreId = $env:ZID_STORE_ID
if (-not $zidStoreId) {
  $zidStoreId = "1052373"
}

$zidProductId = $env:ZID_PRODUCT_ID
if (-not $zidProductId) {
  $zidProductId = "56367672"
}

$zidTrackingId = $env:ZID_TRACKING_ID
if (-not $zidTrackingId) {
  $zidTrackingId = "raff_test_zid_001"
}

$zidTrackingIdExpired = $env:ZID_TRACKING_ID_EXPIRED
if (-not $zidTrackingIdExpired) {
  $zidTrackingIdExpired = "raff_test_zid_expired"
}

$sallaStoreId = $env:SALLA_STORE_ID
if (-not $sallaStoreId) {
  $sallaStoreId = "123456789"
}

$sallaProductId = $env:SALLA_PRODUCT_ID
if (-not $sallaProductId) {
  $sallaProductId = "987654321"
}

$sallaTrackingId = $env:SALLA_TRACKING_ID
if (-not $sallaTrackingId) {
  $sallaTrackingId = "raff_test_salla_001"
}

$sallaTrackingIdExpired = $env:SALLA_TRACKING_ID_EXPIRED
if (-not $sallaTrackingIdExpired) {
  $sallaTrackingIdExpired = "raff_test_salla_expired"
}

$runId = $env:RUN_ID
if (-not $runId) {
  $runId = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
}

$zidOrder001 = "ZID-ORD-001-$runId"
$zidOrder002 = "ZID-ORD-002-$runId"
$zidOrderExpired = "ZID-ORD-EXPIRED-$runId"
$zidOrderDuplicate = "ZID-ORD-DUPLICATE-$runId"
$zidOrderInvalid = "ZID-ORD-INVALID-$runId"
$zidOrderMultiPrefix = "ZID-ORD-MULTI-$runId"

$sallaOrder001 = "SALLA-ORD-001-$runId"
$sallaOrder002 = "SALLA-ORD-002-$runId"
$sallaOrder003 = "SALLA-ORD-003-$runId"
$sallaOrderExpired = "SALLA-ORD-EXPIRED-$runId"
$sallaOrderDuplicate = "SALLA-ORD-DUPLICATE-$runId"

function Append-TokenToUrl {
  param(
    [string]$Url,
    [string]$Token
  )

  if (-not $Token) {
    return $Url
  }

  $builder = New-Object System.UriBuilder($Url)
  $encoded = [System.Uri]::EscapeDataString($Token)

  if ([string]::IsNullOrWhiteSpace($builder.Query)) {
    $builder.Query = "token=$encoded"
  } else {
    $builder.Query = $builder.Query.TrimStart("?") + "&token=$encoded"
  }

  return $builder.Uri.AbsoluteUri
}

function Get-Signature {
  param(
    [string]$Mode,
    [string]$Secret,
    [string]$Body
  )

  if ($Mode -eq "plain") {
    return $Secret
  }

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)

  if ($Mode -eq "sha256") {
    $hash = [System.Security.Cryptography.SHA256]::Create()
    $input = [System.Text.Encoding]::UTF8.GetBytes($Secret + $Body)
    $computed = $hash.ComputeHash($input)
    return ($computed | ForEach-Object { $_.ToString("x2") }) -join ""
  }

  if ($Mode -eq "hmac-sha256") {
    $key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $hmac = New-Object System.Security.Cryptography.HMACSHA256($key)
    $computed = $hmac.ComputeHash($bytes)
    return ($computed | ForEach-Object { $_.ToString("x2") }) -join ""
  }

  throw "Unsupported signature mode: $Mode"
}

function Invoke-WebhookTest {
  param(
    [string]$Name,
    [string]$Url,
    [string]$HeaderName,
    [string]$Secret,
    [object]$Payload,
    [string]$SignatureMode,
    [string]$ExtraHeaderName = "",
    [string]$ExtraHeaderValue = ""
  )

  $json = $Payload | ConvertTo-Json -Depth 10 -Compress
  $headers = @{}

  if ($HeaderName -and $Secret) {
    $headers[$HeaderName] = Get-Signature -Mode $SignatureMode -Secret $Secret -Body $json
  }

  if ($ExtraHeaderName -and $ExtraHeaderValue) {
    $headers[$ExtraHeaderName] = $ExtraHeaderValue
  }

  Write-Host "Testing: $Name"

  try {
    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $requestParams = @{
      Method = "Post"
      Uri = $Url
      Headers = $headers
      Body = $jsonBytes
      ContentType = "application/json; charset=utf-8"
      ErrorAction = "Stop"
    }

    if ($PSVersionTable.PSVersion.Major -lt 6) {
      $requestParams["UseBasicParsing"] = $true
    }

    $response = Invoke-WebRequest @requestParams
    $statusCode = [int]$response.StatusCode
    $body = $response.Content
  } catch {
    $statusCode = 0
    $body = $_.Exception.Message

    if ($_.Exception.Response) {
      $resp = $_.Exception.Response
      try {
        $statusCode = [int]$resp.StatusCode
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $body = $reader.ReadToEnd()
      } catch {
        $body = $_.Exception.Message
      }
    }
  }

  if ($statusCode -eq 200) {
    Write-Host "  Success (HTTP $statusCode)"
  } else {
    Write-Host "  Failed (HTTP $statusCode)"
  }
  Write-Host "  Response: $body"
  Write-Host ""
  Start-Sleep -Seconds 1
}

$zidWebhookUrl = Append-TokenToUrl -Url $zidWebhookUrl -Token $zidWebhookToken

Write-Host "========================================"
Write-Host "Raff Webhook Testing Script"
Write-Host "========================================"
Write-Host ""
Write-Host "Configuration:"
Write-Host "Zid Store ID: $zidStoreId"
Write-Host "Zid Product ID: $zidProductId"
Write-Host "Zid Tracking ID: $zidTrackingId"
Write-Host "Zid Expired Tracking ID: $zidTrackingIdExpired"
Write-Host ""
Write-Host "Salla Store ID: $sallaStoreId"
Write-Host "Salla Product ID: $sallaProductId"
Write-Host "Salla Tracking ID: $sallaTrackingId"
Write-Host "Salla Expired Tracking ID: $sallaTrackingIdExpired"
Write-Host ""

Write-Host "========================================"
Write-Host "Testing Zid Webhooks"
Write-Host "========================================"
Write-Host ""

Invoke-WebhookTest "1. Zid - Product Created" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "product.create"
  product_id = $zidProductId
  store_id = $zidStoreId
  data = @{
    id = $zidProductId
    title = "New Test Product"
    price = 99.99
    currency = "SAR"
  }
} $zidSignatureMode

Invoke-WebhookTest "2. Zid - Product Updated" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "product.update"
  product_id = $zidProductId
  store_id = $zidStoreId
  data = @{
    id = $zidProductId
    title = "Updated Test Product"
    price = 149.99
    currency = "SAR"
  }
} $zidSignatureMode

Invoke-WebhookTest "3. Zid - Product Published" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "product.publish"
  product_id = $zidProductId
  store_id = $zidStoreId
  data = @{
    id = $zidProductId
    title = "Published Test Product"
    price = 199.99
    currency = "SAR"
  }
} $zidSignatureMode

Invoke-WebhookTest "4. Zid - Product Deleted" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "product.delete"
  product_id = $zidProductId
  store_id = $zidStoreId
} $zidSignatureMode

Invoke-WebhookTest "5. Zid - Order Created (No Referrer)" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "order.create"
  order_id = $zidOrder001
  store_id = $zidStoreId
  data = @{
    id = $zidOrder001
    total = 250.00
    currency = "SAR"
    payment_status = "pending"
    status = "pending"
    created_at = "2025-01-01T10:00:00Z"
  }
} $zidSignatureMode

Invoke-WebhookTest "6. Zid - Order Created (With Referrer -> PENDING)" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "order.create"
  order_id = $zidOrder002
  store_id = $zidStoreId
  data = @{
    id = $zidOrder002
    total = 300.00
    currency = "SAR"
    referer_code = $zidTrackingId
    payment_status = "pending"
    status = "pending"
    created_at = "2025-01-01T10:05:00Z"
  }
} $zidSignatureMode

Invoke-WebhookTest "7. Zid - Order Payment Confirmed (PENDING -> APPROVED)" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "order.payment_status.update"
  order_id = $zidOrder002
  store_id = $zidStoreId
  data = @{
    id = $zidOrder002
    total = 300.00
    currency = "SAR"
    referer_code = $zidTrackingId
    payment_status = "paid"
    status = "confirmed"
    updated_at = "2025-01-01T10:10:00Z"
  }
} $zidSignatureMode

Invoke-WebhookTest "8. Zid - Order Status Update (Delivered)" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "order.status.update"
  order_id = $zidOrder002
  store_id = $zidStoreId
  data = @{
    id = $zidOrder002
    total = 300.00
    currency = "SAR"
    referer_code = $zidTrackingId
    payment_status = "paid"
    status = "delivered"
    updated_at = "2025-01-01T11:00:00Z"
  }
} $zidSignatureMode

Invoke-WebhookTest "9. Zid - Order Refunded (APPROVED -> CANCELLED)" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "order.payment_status.update"
  order_id = $zidOrder002
  store_id = $zidStoreId
  data = @{
    id = $zidOrder002
    total = 300.00
    currency = "SAR"
    referer_code = $zidTrackingId
    payment_status = "refunded"
    status = "cancelled"
    updated_at = "2025-01-01T12:00:00Z"
  }
} $zidSignatureMode

Invoke-WebhookTest "10. Zid - Order Created (Expired Referrer)" $zidWebhookUrl $zidHeader $zidSecret @{
  event = "order.create"
  order_id = $zidOrderExpired
  store_id = $zidStoreId
  data = @{
    id = $zidOrderExpired
    total = 200.00
    currency = "SAR"
    referer_code = $zidTrackingIdExpired
    payment_status = "paid"
    status = "confirmed"
    created_at = "2025-01-01T12:15:00Z"
  }
} $zidSignatureMode

Write-Host "Testing: 11. Zid - Idempotency (Duplicate Order)"
for ($i = 1; $i -le 2; $i++) {
  $payload = @{
    event = "order.create"
    order_id = $zidOrderDuplicate
    store_id = $zidStoreId
    data = @{
      id = $zidOrderDuplicate
      total = 100.00
      currency = "SAR"
      referer_code = $zidTrackingId
      payment_status = "paid"
      status = "confirmed"
    }
  }
  Invoke-WebhookTest "11.$i. Zid - Idempotency (Duplicate Order)" $zidWebhookUrl $zidHeader $zidSecret $payload $zidSignatureMode
}

Write-Host "Testing: 12. Zid - Multi-order Same Tracking (3 orders)"
for ($i = 1; $i -le 3; $i++) {
  $orderId = "$zidOrderMultiPrefix-$i"
  Invoke-WebhookTest "12.$i. Zid - Multi-order Same Tracking" $zidWebhookUrl $zidHeader $zidSecret @{
    event = "order.create"
    order_id = $orderId
    store_id = $zidStoreId
    data = @{
      id = $orderId
      total = 120.00
      currency = "SAR"
      referer_code = $zidTrackingId
      payment_status = "paid"
      status = "confirmed"
      created_at = "2025-01-01T12:30:00Z"
    }
  } $zidSignatureMode
}

Invoke-WebhookTest "13. Zid - Invalid Signature (Should Fail)" $zidWebhookUrl $zidHeader "INVALID_SECRET_123" @{
  event = "order.create"
  order_id = $zidOrderInvalid
} $zidSignatureMode

Write-Host "========================================"
Write-Host "Testing Salla Webhooks"
Write-Host "========================================"
Write-Host ""

Invoke-WebhookTest "14. Salla - App Authorization" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "app.store.authorize"
  merchant = @{
    id = $sallaStoreId
    name = "Test Salla Store"
    email = "test@salla.sa"
  }
  data = @{
    access_token = "new-test-token-12345"
    refresh_token = "new-refresh-token-67890"
    expires_in = 31536000
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "15. Salla - Product Created" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "product.created"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaProductId
    name = "New Salla Product"
    price = @{
      amount = 199.99
      currency = "SAR"
    }
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "16. Salla - Product Updated" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "product.updated"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaProductId
    name = "Updated Salla Product"
    price = @{
      amount = 249.99
      currency = "SAR"
    }
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "17. Salla - Product Published" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "product.published"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaProductId
    name = "Published Salla Product"
    price = @{
      amount = 299.99
      currency = "SAR"
    }
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "18. Salla - Product Deleted" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "product.deleted"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaProductId
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "19. Salla - Order Created (No Referrer)" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "order.created"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaOrder001
    total = @{
      amount = 350.00
      currency = "SAR"
    }
    payment = @{
      status = "pending"
    }
    status = @{
      code = "pending"
    }
    created_at = "2025-01-01T13:00:00Z"
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "20. Salla - Order Created (With Referrer -> PENDING)" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "order.created"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaOrder002
    total = @{
      amount = 400.00
      currency = "SAR"
    }
    referrer = $sallaTrackingId
    payment = @{
      status = "pending"
    }
    status = @{
      code = "pending"
    }
    created_at = "2025-01-01T13:05:00Z"
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "21. Salla - Order Paid (PENDING -> APPROVED)" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "order.paid"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaOrder002
    total = @{
      amount = 400.00
      currency = "SAR"
    }
    referrer = $sallaTrackingId
    payment = @{
      status = "paid"
    }
    status = @{
      code = "confirmed"
    }
    updated_at = "2025-01-01T13:10:00Z"
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "22. Salla - Order Status Updated (Delivered)" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "order.status.updated"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaOrder002
    total = @{
      amount = 400.00
      currency = "SAR"
    }
    referrer = $sallaTrackingId
    payment = @{
      status = "paid"
    }
    status = @{
      code = "delivered"
    }
    updated_at = "2025-01-01T14:00:00Z"
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "23. Salla - Order Cancelled (APPROVED -> CANCELLED)" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "order.cancelled"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaOrder002
    total = @{
      amount = 400.00
      currency = "SAR"
    }
    referrer = $sallaTrackingId
    payment = @{
      status = "refunded"
    }
    status = @{
      code = "cancelled"
    }
    updated_at = "2025-01-01T14:30:00Z"
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "24. Salla - Order Created (Directly Paid -> APPROVED)" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "order.created"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaOrder003
    total = @{
      amount = 550.00
      currency = "SAR"
    }
    referrer = $sallaTrackingId
    payment = @{
      status = "paid"
    }
    status = @{
      code = "confirmed"
    }
    created_at = "2025-01-01T14:30:00Z"
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Invoke-WebhookTest "25. Salla - Order Created (Expired Referrer)" $sallaWebhookUrl $sallaHeader $sallaSecret @{
  event = "order.created"
  merchant = @{
    id = $sallaStoreId
  }
  data = @{
    id = $sallaOrderExpired
    total = @{
      amount = 220.00
      currency = "SAR"
    }
    referrer = $sallaTrackingIdExpired
    payment = @{
      status = "paid"
    }
    status = @{
      code = "confirmed"
    }
    created_at = "2025-01-01T14:40:00Z"
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Write-Host "Testing: 26. Salla - Idempotency (Duplicate Order)"
for ($i = 1; $i -le 2; $i++) {
  $payload = @{
    event = "order.created"
    merchant = @{
      id = $sallaStoreId
    }
    data = @{
      id = $sallaOrderDuplicate
      total = @{
        amount = 150.00
        currency = "SAR"
      }
      referrer = $sallaTrackingId
      payment = @{
        status = "paid"
      }
      status = @{
        code = "confirmed"
      }
    }
  }
  Invoke-WebhookTest "26.$i. Salla - Idempotency (Duplicate Order)" $sallaWebhookUrl $sallaHeader $sallaSecret $payload $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy
}

Invoke-WebhookTest "27. Salla - Invalid Signature (Should Fail)" $sallaWebhookUrl $sallaHeader "INVALID_SECRET_456" @{
  event = "order.created"
  merchant = @{
    id = $sallaStoreId
  }
} $sallaSignatureMode $sallaSecurityHeader $sallaSecurityStrategy

Write-Host "========================================"
Write-Host "Webhook Testing Complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Test Summary:"
Write-Host "  Zid Product Events: 4 tests"
Write-Host "  Zid Order Events: 6 tests"
Write-Host "  Zid Edge Cases: 3 tests"
Write-Host "  Salla App Auth: 1 test"
Write-Host "  Salla Product Events: 4 tests"
Write-Host "  Salla Order Events: 7 tests"
Write-Host "  Salla Edge Cases: 2 tests"
Write-Host "  Total: 27 tests"
Write-Host ""
Write-Host "Verification Steps:"
Write-Host "1. Check application logs for webhook processing"
Write-Host "2. Open Prisma Studio: npx prisma studio"
Write-Host "3. Verify tables:"
Write-Host "   - WebhookLog (should have ~27 entries)"
Write-Host "   - Commission (check status transitions and cancellations)"
Write-Host "   - ClickTracking (converted=true for paid orders)"
Write-Host ""
Write-Host "Expected Results:"
Write-Host "  - Product events: 200 OK"
Write-Host "  - Orders without referrer: 200 OK (no commission)"
Write-Host "  - Orders with referrer (pending): PENDING commission"
Write-Host "  - Orders with payment: APPROVED commission"
Write-Host "  - Cancel/refund events: CANCELLED commission"
Write-Host "  - Duplicate webhooks: idempotent (no duplicate commissions)"
Write-Host "  - Invalid signatures: 401 Unauthorized"
Write-Host ""
