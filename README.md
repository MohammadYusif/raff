# Raff (رَفّ) - E-Commerce Discovery Platform

> One shelf, many stores - Discover trending products from Saudi online stores

## 🎯 What is Raff?

Raff is a Saudi-based e-commerce discovery and aggregation platform that sits on top of existing online stores (starting with Salla). It's not a marketplace - it's a curated discovery layer that helps customers find trending products while orders are fulfilled by the original merchants.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis (optional, for caching)
- Salla Developer Account (for API access)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/raff.git
cd raff
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

4. **Set up database**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed database
npm run db:seed
```

5. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
raff/
├── prisma/              # Database schema and migrations
├── public/              # Static assets
│   ├── images/
│   └── messages/        # i18n translations
├── src/
│   ├── app/            # Next.js App Router
│   ├── core/           # Core infrastructure (i18n, auth)
│   ├── features/       # Feature modules
│   │   ├── products/
│   │   ├── merchants/
│   │   ├── orders/
│   │   └── salla-integration/
│   ├── shared/         # Shared components
│   └── lib/            # Third-party integrations
```

## 🔑 Environment Variables

See `.env.example` for all required variables. Key ones:

- `DATABASE_URL` - PostgreSQL connection string
- `SALLA_CLIENT_SECRET` - Salla API credentials
- `NEXTAUTH_SECRET` - Authentication secret
- `RESEND_API_KEY` - Email service

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

### Authentication Notes

- Credentials login requires NextAuth JWT sessions.
- PrismaAdapter is still enabled for account/session models.

### Database Migrations

```bash
# Create a new migration
npm run db:migrate

# Apply migrations
npm run db:push

# View database in browser
npm run db:studio
```

## 🌐 i18n (Internationalization)

Raff supports Arabic and English:

- Default locale: Arabic (ar)
- Translations: `public/messages/en.json` and `ar.json`
- RTL support built-in

## 🔗 Salla Integration

### Setting up Salla OAuth

1. Create app at [https://salla.dev](https://salla.dev)
2. Set redirect URI to: `https://yourdomain.com/api/salla/oauth`
3. Add credentials to `.env.local`
4. Merchants authorize via OAuth flow

### Syncing Products

Products are synced via:
- Manual sync (merchant dashboard)
- Automated webhooks
- Scheduled jobs

## 📊 Features

### MVP (Phase 1)
- ✅ Product discovery page
- ✅ Merchant store pages
- ✅ Basic trending algorithm
- ✅ Salla product sync
- ✅ Order forwarding to Salla
- ✅ Bilingual support (AR/EN)

### Planned (Phase 2+)
- AI-driven recommendations
- Multi-platform support (Zid, Shopify)
- Advanced analytics
- Social commerce integration

## 🏗️ Architecture Decisions

- **Feature-based structure** - Each domain is self-contained
- **API-first design** - Easy to add mobile apps
- **Bilingual from day 1** - Arabic and English
- **Salla abstraction** - Easy to add more platforms
- **Caching with Redis** - Fast product listings
- **TypeScript** - Full type safety

## 📝 Database Schema

Key models:
- `Merchant` - Stores using Raff
- `Product` - Products from merchants
- `Order` - Orders forwarded to Salla
- `User` - Customers
- `Category` - Product categories

See `prisma/schema.prisma` for full schema.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For questions or issues:
- Email: support@raff.sa
- Documentation: docs.raff.sa

---

Built with ❤️ for Saudi e-commerce
