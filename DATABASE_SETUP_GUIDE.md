# Database Setup Guide 🗄️

Choose your preferred database setup method. We'll walk through each option.

---

## ⭐ Option 1: Docker PostgreSQL (Recommended)

**Pros:**
- ✅ Easiest setup (one command)
- ✅ No PostgreSQL installation needed
- ✅ Easy to reset/recreate
- ✅ Works on all operating systems

**Prerequisites:**
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))

### Step-by-Step Setup:

#### 1. Start Docker Database

```bash
# Navigate to your project directory
cd raff-setup

# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                 STATUS         PORTS
abc123def456   postgres:16-alpine    Up 10 seconds  0.0.0.0:5432->5432/tcp
```

#### 2. Create `.env.local` file

```bash
# Copy the template
cp .env.local.template .env.local
```

Your `.env.local` already has the correct credentials:
```env
DATABASE_URL="postgresql://raff:raff_dev_password_2024@localhost:5432/raff"
```

#### 3. Generate NEXTAUTH_SECRET

```bash
# Generate a random secret
openssl rand -base64 32
```

Copy the output and paste it in `.env.local`:
```env
NEXTAUTH_SECRET="your_generated_secret_here"
```

#### 4. Initialize Database

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Create database tables
npm run db:push
```

**Expected output:**
```
✔ Generated Prisma Client
✔ Database synchronized
```

#### 5. Verify Database

```bash
# Open Prisma Studio
npm run db:studio
```

Opens browser at `http://localhost:5555` - you should see your database tables!

### Docker Commands Reference:

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# Stop and remove all data (reset)
docker-compose down -v

# View logs
docker-compose logs postgres

# Connect to database directly
docker exec -it raff-postgres psql -U raff -d raff
```

---

## ☁️ Option 2: Supabase (Free Cloud Database)

**Pros:**
- ✅ No local setup
- ✅ Free tier (500MB storage)
- ✅ Already hosted and managed
- ✅ Web-based SQL editor

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ Slight latency (cloud-based)

### Step-by-Step Setup:

#### 1. Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub/Google
4. Click **"New Project"**

#### 2. Create Project

Fill in the details:
- **Name:** `raff-dev`
- **Database Password:** Create a strong password (save it!)
- **Region:** Choose closest to Saudi Arabia (e.g., Singapore)
- **Pricing Plan:** Free

Click **"Create new project"** (takes ~2 minutes)

#### 3. Get Database Connection String

1. In your Supabase project, go to **Settings** → **Database**
2. Scroll to **Connection String** → **URI**
3. Copy the connection string

It looks like:
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

#### 4. Update `.env.local`

```bash
# Create .env.local
cp .env.local.template .env.local
```

Replace the `DATABASE_URL` with your Supabase connection string:
```env
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

**Important:** Add `?pgbouncer=true&connection_limit=1` at the end:
```env
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

#### 5. Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Add to `.env.local`:
```env
NEXTAUTH_SECRET="your_generated_secret"
```

#### 6. Initialize Database

```bash
npm install
npm run db:generate
npm run db:push
```

#### 7. Verify

Go to Supabase Dashboard → **Table Editor** - you should see your tables!

---

## 🖥️ Option 3: Local PostgreSQL

**Pros:**
- ✅ Full control
- ✅ Fastest (no Docker overhead)
- ✅ Professional setup

**Cons:**
- ⚠️ Requires PostgreSQL installation
- ⚠️ OS-specific installation

### Installation by OS:

#### **macOS:**
```bash
# Install with Homebrew
brew install postgresql@16

# Start PostgreSQL
brew services start postgresql@16

# Create user and database
createuser -s raff
createdb -O raff raff
```

#### **Linux (Ubuntu/Debian):**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Create user and database
sudo -u postgres createuser -s raff
sudo -u postgres createdb -O raff raff
```

#### **Windows:**
1. Download PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run installer (keep default port 5432)
3. Remember the password you set for `postgres` user
4. Open pgAdmin 4 or use command line to create database

### After Installation:

Update `.env.local`:
```env
DATABASE_URL="postgresql://raff:@localhost:5432/raff"
```

Then run:
```bash
npm install
npm run db:generate
npm run db:push
```

---

## 🎯 Which Option Should You Choose?

| Option | Best For | Setup Time |
|--------|----------|------------|
| **Docker** | Most developers | 2 minutes |
| **Supabase** | Quick start, no local setup | 5 minutes |
| **Local PostgreSQL** | Production-like environment | 10 minutes |

---

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Check database connection
npm run db:studio

# 2. Start dev server
npm run dev

# 3. In another terminal, test database
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.\$connect().then(() => console.log('✅ Connected!')).catch(e => console.error('❌', e));
"
```

**Expected:** "✅ Connected!"

---

## 🆘 Troubleshooting

### "Connection refused" error:

**Docker:**
```bash
docker-compose ps  # Check if running
docker-compose up -d  # Start if not running
```

**Supabase:**
- Check connection string has no spaces
- Verify password is correct
- Ensure `?pgbouncer=true` is at the end

**Local:**
```bash
# macOS/Linux
sudo systemctl status postgresql  # Check if running

# Windows
services.msc  # Check if PostgreSQL service is running
```

### "Database does not exist":

```bash
# For Docker
docker-compose down -v
docker-compose up -d
npm run db:push

# For local PostgreSQL
createdb raff
npm run db:push
```

### Port 5432 already in use:

```bash
# Find what's using it
lsof -i :5432  # macOS/Linux
netstat -ano | findstr :5432  # Windows

# Kill it or change Docker port in docker-compose.yml:
ports:
  - "5433:5432"  # Use 5433 instead

# Update .env.local
DATABASE_URL="postgresql://raff:raff_dev_password_2024@localhost:5433/raff"
```

---

## 🎉 Next Steps

Once database is working:

1. ✅ Database running
2. ✅ `.env.local` configured
3. ✅ `npm run db:push` successful
4. ✅ `npm run db:studio` opens

**You're ready for development!** 🚀

Continue with the main setup guide: `STEP_1_SETUP_CHECKLIST_NEXTJS15.md`
