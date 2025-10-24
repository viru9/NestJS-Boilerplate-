# 🚀 Quick Start Guide

Get your backend running in **5 minutes**!

## Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ (if running locally)

## Option 1: Docker (Recommended)

### Step 1: Start Services
```bash
cd "D:\Sample Apps\backend"
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 3000)

### Step 2: Run Migrations
```bash
docker-compose exec app npx prisma migrate dev --name init
```

### Step 3: Seed Database
```bash
docker-compose exec app npx prisma db seed
```

### Step 4: Test It
Open your browser:
- **API Docs:** http://localhost:3000/api-docs
- **Health Check:** http://localhost:3000/api/v1/health

---

## Option 2: Local Development

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start PostgreSQL & Redis
Make sure PostgreSQL and Redis are running locally.

### Step 3: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

### Step 4: Run Migrations
```bash
npx prisma migrate dev
npx prisma db seed
```

### Step 5: Start Server
```bash
npm run start:dev
```

---

## Test Accounts

After seeding, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Admin123! |
| User | user@example.com | User123! |
| Premium | premium@example.com | Premium123! |

---

## Try the API

### 1. Register a New User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

Copy the `accessToken` from the response.

### 3. Get Profile
```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Upload a File
```bash
curl -X POST http://localhost:3000/api/v1/storage/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/your/file.jpg"
```

---

## Explore with Swagger

Visit http://localhost:3000/api-docs for interactive API documentation.

1. Click **"Authorize"** button
2. Enter: `Bearer YOUR_ACCESS_TOKEN`
3. Try any endpoint!

---

## View Database

```bash
npx prisma studio
```

Opens a GUI at http://localhost:5555

---

## Check Logs

```bash
# Docker
docker-compose logs -f app

# Local
# Logs are in ./logs/ directory
```

---

## Stop Services

```bash
docker-compose down
```

---

## Common Issues

### Port Already in Use
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

### Database Connection Failed
```bash
# Check DATABASE_URL in .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/backend_db
```

### Redis Connection Failed
```bash
# Check if Redis is running
docker-compose ps redis
```

---

## Next Steps

1. **Read Documentation**
   - `docs/ENDPOINT_CREATION.md` - Add new endpoints
   - `docs/AUTHENTICATION.md` - Auth guide
   - `docs/DEPLOYMENT.md` - Deploy to production

2. **Integrate with Frontend**
   - API base URL: http://localhost:3000/api/v1
   - Swagger JSON: http://localhost:3000/api-json

3. **Customize**
   - Add your business logic
   - Create new modules
   - Update email templates

---

## Useful Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run prisma:studio      # Open database GUI

# Database
npm run prisma:migrate     # Run migrations
npm run prisma:seed        # Seed data
npm run prisma:generate    # Generate Prisma client

# Docker
npm run docker:up          # Start services
npm run docker:down        # Stop services
npm run docker:logs        # View logs

# Code Quality
npm run lint               # Lint code
npm run format             # Format code
npm run test               # Run tests
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/backend_db

# JWT (CHANGE IN PRODUCTION!)
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Email (Optional for now)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# OpenAI (Optional for now)
OPENAI_API_KEY=sk-...
```

---

## Help & Support

- **Documentation:** `docs/` directory
- **API Docs:** http://localhost:3000/api-docs
- **Swagger JSON:** http://localhost:3000/api-json

---

**You're all set! Start building! 🚀**

