# Raff - E-Commerce Discovery Platform

> One shelf, many stores — Discover trending products from Saudi online stores.

Raff is a product discovery and aggregation layer built on top of existing Saudi e-commerce platforms. It connects merchants from **Salla** and **Zid** through OAuth, syncs their catalogs, and surfaces trending products to customers — all while orders are fulfilled by the original stores.

---

## Tech Stack

| Layer            | Technology                                          |
|------------------|-----------------------------------------------------|
| Framework        | Next.js 16 (App Router, Turbopack)                  |
| UI               | React 19, TailwindCSS 4, Framer Motion 12           |
| Language         | TypeScript 5.8                                      |
| Database         | PostgreSQL 14+ via Prisma 6 ORM                     |
| Authentication   | NextAuth 4 (JWT sessions, Prisma Adapter)           |
| Email            | Resend 6                                            |
| Validation       | Zod 3, React Hook Form 7                            |
| i18n             | next-intl 4 (Arabic default, English)               |
| Deployment       | Docker, Railway                                     |

---

## Architecture Overview

```mermaid
graph TB
    subgraph Clients
        Browser[Browser / Mobile]
    end

    subgraph Next.js["Next.js 16 (App Router)"]
        SC[Server Components]
        CC[Client Components]
        API[API Routes]
    end

    subgraph External["External Platforms"]
        Salla[Salla API]
        Zid[Zid API]
    end

    subgraph Services
        Auth[NextAuth]
        Email[Resend Email]
        Cron[Cron Service]
    end

    subgraph Data
        DB[(PostgreSQL)]
        Redis[(Redis Cache)]
    end

    Browser --> SC & CC
    SC --> DB
    CC -->|fetch| API
    API --> DB
    API --> Salla & Zid
    Salla & Zid -->|Webhooks| API
    Auth --> DB
    Cron --> DB
    API --> Email
    API --> Redis
```

---

## Merchant Onboarding Flow

```mermaid
sequenceDiagram
    participant M as Merchant
    participant R as Raff
    participant P as Salla / Zid

    M->>R: Register account
    R->>M: Send OTP email
    M->>R: Verify OTP
    M->>R: Click "Connect Store"
    R->>P: OAuth redirect
    P->>M: Authorize access
    P->>R: OAuth callback (tokens)
    R->>R: Store tokens + create merchant
    R->>P: Register webhooks
    R->>P: Sync products & categories
    R->>M: Dashboard ready
```

---

## Webhook Processing Pipeline

```mermaid
flowchart LR
    A[Incoming Webhook] --> B{Signature Valid?}
    B -->|No| C[Reject 401]
    B -->|Yes| D{Duplicate?}
    D -->|Yes| E[Skip - Idempotent]
    D -->|No| F[Normalize Payload]
    F --> G[Log to WebhookEvent]
    G --> H{Event Type}
    H -->|product.updated| I[Sync Product]
    H -->|order.created| J[Process Order]
    H -->|app.store.authorize| K[Re-auth Merchant]
    H -->|app.uninstalled| L[Deactivate Merchant]
```

---

## Trending Score Calculation

```mermaid
flowchart TD
    A[Cron: Every 3 Hours] --> B[Query engagement data<br/>14-day lookback]
    B --> C[Calculate weighted score]
    C --> D["Views x1 + Clicks x5<br/>+ Orders x50 + Recency x10"]
    D --> E[Normalize 0-100]
    E --> F[Update product.trendingScore]
    F --> G[Log to TrendingLog]
```

---

## Click Attribution & Commission Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as Raff
    participant S as Merchant Store
    participant W as Webhook

    U->>R: View product on Raff
    R->>R: Log view (TrendingLog)
    U->>R: Click "Buy" button
    R->>R: Create ClickTracking record
    R->>S: Redirect to merchant store
    U->>S: Complete purchase
    S->>W: Order webhook
    W->>R: POST /api/salla/webhook
    R->>R: Match order to ClickTracking
    R->>R: Calculate commission (5%)
    R->>R: Create Commission record
```

---

## Data Model

```mermaid
erDiagram
    User ||--o{ Merchant : owns
    Merchant ||--o{ Product : sells
    Merchant ||--o{ Order : receives
    Merchant ||--o{ Commission : earns
    Category ||--o{ Product : contains
    Product ||--o{ ClickTracking : tracks
    Product ||--o{ TrendingLog : logs
    Order ||--o{ Commission : generates
    Merchant ||--o{ WebhookEvent : receives

    User {
        string id PK
        string email
        string name
        enum role
    }
    Merchant {
        string id PK
        string name
        string sallaStoreId
        string zidStoreId
        enum status
        decimal commissionRate
    }
    Product {
        string id PK
        string title
        decimal price
        int trendingScore
        string slug
        boolean isActive
    }
    Order {
        string id PK
        decimal totalPrice
        string currency
        enum status
    }
    Commission {
        string id PK
        decimal orderTotal
        decimal commissionRate
        decimal commissionAmount
    }
```

---

## Key Features

### Multi-Platform OAuth Integration
Merchants connect their **Salla** or **Zid** stores through a full OAuth 2.0 flow. After authorization, Raff automatically syncs products, categories, and store metadata. Token refresh is handled transparently, and webhook endpoints are registered on the merchant's behalf.

### Automated Trending System
A weighted scoring algorithm ranks products based on real engagement data:
- **Views** (x1), **Clicks** (x5), **Orders** (x50), plus a **recency boost** (x10) for products added in the last 30 days.
- Scores are recalculated every 3 hours via a cron service with a 14-day lookback window.
- All engagement events are logged to `TrendingLog` for auditability.

### Conversion Tracking & Commissions
Click-through attribution links Raff traffic to merchant orders. When an order webhook arrives, the system matches it to a tracked click, calculates commission (configurable per merchant, default 5%), and logs the result. Idempotency constraints prevent duplicate processing.

### Fraud Detection
A risk scoring pipeline flags suspicious activity — high-frequency orders, self-purchase patterns, bot user-agents, and IP clustering. Signals are logged with severity levels and configurable thresholds per environment.

### Admin Dashboard
A real-time admin panel accessible on mobile for monitoring and managing the platform:
- **System Health** — Live status of DB, Salla API, and Zid API connectivity.
- **Console Logs** — All server-side errors stream to an in-memory LogStore, filterable by namespace.
- **Quick Actions** — Trigger syncs, recalculate trending, clear cache from your phone.
- **Alerts** — Pending merchants, expired tokens, stale syncs, products missing images.

### Full Internationalization (i18n)
The entire UI supports **Arabic** (default, RTL) and **English**. Translations live in `public/messages/` and are loaded server-side via `next-intl`. Dates use the `Asia/Riyadh` timezone.

### Webhook Processing Pipeline
Inbound webhooks from Salla and Zid pass through signature verification (HMAC-SHA256), payload normalization, idempotency deduplication, and event logging before reaching business logic. A 90-day retention policy keeps the audit trail manageable.

---

## Project Structure

```
raff/
├── prisma/                 # Schema, migrations, seed
├── scripts/                # Cron jobs, trending calculation, cleanup
├── public/messages/        # i18n translations (ar.json, en.json)
├── src/
│   ├── app/                # Next.js App Router (pages + API routes)
│   │   ├── admin/          # Admin dashboard
│   │   ├── merchant/       # Merchant dashboard & settings
│   │   ├── products/       # Product listing & detail pages
│   │   ├── api/            # API routes (auth, webhooks, CRUD)
│   │   └── ...             # Other pages (cart, orders, search)
│   ├── lib/
│   │   ├── platform/       # Unified Salla/Zid abstraction
│   │   ├── services/       # Business logic (email, OTP, notifications)
│   │   ├── sync/           # Product & store sync orchestration
│   │   ├── utils/          # Logger, helpers, formatting
│   │   └── auth/           # Auth guards, admin middleware
│   ├── features/           # Feature modules (navbar, footer, homepage)
│   ├── shared/             # Shared UI components
│   ├── core/               # i18n infrastructure
│   └── types/              # TypeScript definitions
├── docker-compose.yml
└── railway.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or use the included `docker-compose.yml`)
- A [Salla Developer](https://salla.dev) account and/or a [Zid Developer](https://web.zid.sa) account

### Installation

```bash
git clone https://github.com/your-username/raff.git
cd raff
npm install

# Copy environment template and fill in your values
cp .env.example .env.local

# Start PostgreSQL (if using Docker)
docker compose up -d

# Generate Prisma client and apply migrations
npm run db:generate
npm run db:push

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

```bash
npm run dev               # Development server (Turbopack)
npm run build             # Production build
npm run start             # Production server (runs migrations first)
npm run lint              # ESLint
npm run typecheck         # TypeScript type checking
npm run db:generate       # Generate Prisma client
npm run db:push:dev       # Push schema to database
npm run db:migrate        # Create a new migration
npm run db:studio         # Open Prisma Studio
npm run db:seed           # Seed test data
npm run calculate:trending  # Recalculate trending scores
npm run cron:service      # Run scheduled tasks (trending + cleanup)
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list with inline documentation.

---

## Database Schema

Key models: `User`, `Merchant`, `Product`, `Category`, `Order`, `ClickTracking`, `Commission`, `FraudSignal`, `TrendingLog`, `WebhookEvent`, `Notification`.

See [`prisma/schema.prisma`](prisma/schema.prisma) for the complete schema.

---

## License

Proprietary — All rights reserved.
