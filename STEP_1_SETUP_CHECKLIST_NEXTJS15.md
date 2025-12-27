# Step 1: Project Setup Checklist ✅ (Next.js 15)

This is your step-by-step guide to setting up the Raff project from scratch with **Next.js 15** and **Tailwind CSS 4**.

## 📋 Pre-Setup Requirements

Before starting, make sure you have:

- [ ] Node.js 18.18+ or 20+ installed (`node --version`)
- [ ] npm or yarn installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Terminal/Command line access

## 🚀 Setup Steps

### 1. Create Project Directory

```bash
# Create project folder
mkdir raff
cd raff

# Initialize git
git init
```

### 2. Copy Configuration Files

Copy all files from the `raff-setup` folder to your project root:

```
raff/
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
├── .gitignore
├── README.md
├── prisma/
│   └── schema.prisma
└── src/
    ├── app/
    │   └── globals.css
    ├── core/
    │   └── theme/
    │       ├── colors.css
    │       ├── layout.css
    │       └── animations.css
    └── lib/
        └── utils.ts
```

**Note:** No `tailwind.config.ts` or `postcss.config.js` needed! Next.js 15 uses CSS-based configuration.

### 3. Install Dependencies

```bash
npm install
```

**Expected output:**
- Should install ~100+ packages
- **Next.js 15.1.3**, **React 19**, **Tailwind 4.0**
- May show warnings (usually safe to ignore)
- Should take 1-3 minutes

**Common issues:**
- If you get permission errors, try `sudo npm install` (Mac/Linux)
- If you get network errors, check your internet connection
- If packages fail, delete `node_modules` and try again

### 4. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local  # or use your preferred editor
```

**Required variables for MVP:**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/raff"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 5. Set Up PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Create database
createdb raff

# Update DATABASE_URL in .env.local
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/raff"
```

**Option B: Docker PostgreSQL**
```bash
# Run PostgreSQL in Docker
docker run --name raff-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=raff \
  -p 5432:5432 \
  -d postgres:16

# Update DATABASE_URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/raff"
```

**Option C: Cloud Database (Supabase/Neon)**
1. Create free database at [Supabase](https://supabase.com) or [Neon](https://neon.tech)
2. Copy connection string to `DATABASE_URL`

### 6. Initialize Prisma

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push
```

**Expected output:**
```
✔ Generated Prisma Client
✔ Database schema synchronized
```

**Verify database:**
```bash
# Open Prisma Studio to view database
npm run db:studio
```
Opens browser at `http://localhost:5555` - you should see empty tables.

### 7. Verify Setup

**Run development server:**
```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 15.1.3
- Local:        http://localhost:3000
- Turbopack:    enabled

✓ Starting...
✓ Ready in 2.3s
```

**Open browser:** http://localhost:3000
- Should see default Next.js page (we'll create pages next)

### 8. Test Tailwind CSS 4

Create a test page to verify Tailwind works:

```bash
mkdir -p src/app
touch src/app/page.tsx
```

```typescript
// src/app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-raff-primary">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          مرحباً بك في رَفّ
        </h1>
        <p className="text-raff-neutral-200">
          Raff - Your E-Commerce Discovery Platform
        </p>
      </div>
    </div>
  );
}
```

**Reload browser** - should see styled page with Raff colors.

### 9. Test Prisma Client

Create a test script:

```typescript
// src/test/db-test.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Test connection
  const count = await prisma.product.count();
  console.log('Products in database:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run test:**
```bash
npx tsx src/test/db-test.ts
```

Expected: "Products in database: 0"

## ✅ Verification Checklist

Mark each item as complete:

- [ ] Project directory created
- [ ] All config files copied (including CSS files in `src/core/theme/`)
- [ ] Dependencies installed successfully (Next.js 15, React 19, Tailwind 4)
- [ ] `.env.local` file created and configured
- [ ] PostgreSQL database created
- [ ] Prisma Client generated
- [ ] Database schema pushed (tables created)
- [ ] Development server runs without errors
- [ ] Can open http://localhost:3000
- [ ] Tailwind CSS 4 custom colors work (test page)
- [ ] Prisma Studio works
- [ ] TypeScript compiles
- [ ] Database connection works

## 🎯 Key Differences from Next.js 14

### ✨ What's New in Next.js 15:
1. **Turbopack by default** - Faster development builds
2. **React 19** - New React features
3. **Tailwind CSS 4** - CSS-based configuration (no JS config file)
4. **Better caching** - Improved performance

### 🗑️ What's Removed:
1. ❌ `tailwind.config.ts` - Now configured in CSS
2. ❌ `postcss.config.js` - Not needed
3. ❌ Built-in i18n - Now handled by `next-intl`

### 📝 New Files Structure:
```
src/
├── app/
│   └── globals.css          # Main CSS with @theme block
├── core/
│   └── theme/
│       ├── colors.css       # Color variables
│       ├── layout.css       # Layout variables
│       └── animations.css   # Animations & keyframes
└── lib/
    └── utils.ts             # Utility functions
```

## 🎯 Next Steps

Once all items are checked:

1. **Stop the dev server** (Ctrl+C)
2. **Clean up test files** (optional)
```bash
rm -rf src/test
rm src/app/page.tsx  # We'll create proper pages later
```
3. **Commit initial setup**
```bash
git add .
git commit -m "Initial project setup - Next.js 15 + Tailwind 4"
```

4. **Ready for Step 2!** 🎉

## 🆘 Troubleshooting

### "Cannot find module 'next'"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tailwind classes not working
- Verify `src/app/globals.css` has the `@theme` block
- Verify CSS files in `src/core/theme/` exist
- Check import order in `globals.css`

### Database connection fails
- Verify PostgreSQL is running: `pg_isready`
- Check connection string in `.env.local`
- Verify database exists: `psql -l`

### Port 3000 already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Prisma errors
```bash
# Reset Prisma
npx prisma generate
npx prisma db push --force-reset
```

### TypeScript errors
```bash
# Reinstall types
npm install -D @types/node @types/react @types/react-dom
```

## 📚 Useful Commands Reference

```bash
# Development
npm run dev              # Start dev server (with Turbopack)
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma Client
npm run db:push         # Sync schema to DB
npm run db:studio       # Open Prisma Studio

# TypeScript
npx tsc --noEmit       # Check for type errors

# Clean up
rm -rf node_modules .next
npm install
```

## 🌟 Next.js 15 Pro Tips

1. **Turbopack is enabled by default** in dev mode - enjoy faster builds!
2. **Tailwind classes are in CSS now** - check `globals.css` @theme block
3. **React 19 features available** - use new hooks and APIs
4. **Better performance** - Next.js 15 has improved caching

---

**Status:** Step 1 Complete ✅  
**Next:** Step 2 - Core Infrastructure Setup (i18n, components, layouts)
