# Backend API - NestJS Boilerplate

Production-ready backend boilerplate built with NestJS, featuring authentication, AI integration, file uploads, real-time communication, and comprehensive tooling.

## 🚀 Quick Start

Choose your development approach:

| **Docker Stack** 🐳 | **Local Development** 💻 |
|---------------------|--------------------------|
| `docker-compose up -d` | `docker-compose up -d postgres redis` + `npm run start:dev` |
| **Port:** 8000 | **Port:** 3000 |
| **Best for:** Complete environment | **Best for:** Backend development |
| All services included | Faster restarts & debugging |

> **New to this project?** → Use **Docker Stack** for the fastest setup!

## 🚀 Features

### Core Features
- ✅ **Authentication & Authorization** - JWT with refresh tokens, role-based access control
- ✅ **AI Integration** - OpenAI API with streaming responses via WebSocket
- ✅ **File Upload** - Local storage with Multer, file validation
- ✅ **Email Service** - Nodemailer with Handlebars templates
- ✅ **Background Jobs** - Bull queue for async processing
- ✅ **Real-time Communication** - WebSocket support with Socket.IO
- ✅ **Rate Limiting** - Protection against abuse
- ✅ **Error Tracking** - Sentry integration
- ✅ **API Documentation** - Swagger/OpenAPI

### Technical Stack
- **Framework**: NestJS 10+ with TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis 7+
- **Authentication**: JWT with Passport
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Deployment**: Docker & docker-compose

## 📋 Prerequisites

- Node.js 20+ LTS
- Docker & Docker Compose
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)
- npm or yarn

## 🛠️ Development Options

You have **two ways** to run the backend, each with different ports and setups:

### Option 1: Full Docker Stack (Recommended) 🐳

**When to use**: Complete development environment with databases included  
**Port**: `8000`  
**Includes**: PostgreSQL + Redis + Backend API

1. **Start all services**
```bash
docker-compose up -d
```

2. **Access the application**
- **API Base**: http://localhost:8000/api/v1
- **Health Check**: http://localhost:8000/api/v1/health  
- **Swagger Docs**: http://localhost:8000/api-docs

3. **Stop services when done**
```bash
docker-compose down
```

**✅ Advantages:**
- No local database setup required
- Consistent environment
- Matches production setup
- All services included (PostgreSQL, Redis, Backend)

---

### Option 2: Local Development 💻

**When to use**: Frontend development or when you need to modify backend code frequently  
**Port**: `3000`  
**Requirements**: Docker for databases, local Node.js for backend

1. **Start databases only**
```bash
docker-compose up -d postgres redis
```

2. **Install dependencies** (first time only)
```bash
npm install
```

3. **Start the backend locally** 
```bash
npm run start:dev
```
*Note: `.env` file is already configured with PORT=3000*

4. **Access the application**
- **API Base**: http://localhost:3000/api/v1
- **Health Check**: http://localhost:3000/api/v1/health  
- **Swagger Docs**: http://localhost:3000/api-docs

5. **Stop services when done**
```bash
# Stop local backend: Ctrl+C
docker-compose stop postgres redis
```

**✅ Advantages:**
- Faster backend restarts during development
- Easy debugging with breakpoints
- Hot reload for code changes
- Uses different port (3000) than Docker version

---

### 🔄 Switching Between Options

```bash
# Switch from Docker to Local Development
docker-compose down          # Stop all Docker services  
docker-compose up -d postgres redis  # Start only databases
npm run start:dev           # Start backend locally on port 3000

# Switch from Local to Docker  
# Stop local backend (Ctrl+C)
docker-compose down         # Stop databases
docker-compose up -d        # Start full stack on port 8000
```

### 🚨 Port Conflict Troubleshooting

If you get `EADDRINUSE` errors:

**For Docker (port 8000):**
```bash
# Check what's using port 8000
netstat -ano | findstr :8000
# Kill the process
taskkill /PID <process_id> /F
```

**For Local Development (port 3000):**
```bash  
# Check what's using port 3000
netstat -ano | findstr :3000
# Kill the process or edit .env to use different port
PORT=3001
```

## 📝 Environment Variables

See `.env.example` for all available environment variables. Key variables:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/backend_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OpenAI
OPENAI_API_KEY=sk-...

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 🎯 Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start in debug mode
npm run kill:port          # Kill processes using port 3000
npm run restart:dev        # Kill port 3000 and restart dev server

# Production
npm run build              # Build the application
npm run start:prod         # Start production server

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio
npm run prisma:seed        # Seed database

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run e2e tests

# Code Quality
npm run lint               # Lint code
npm run lint:fix           # Fix linting issues
npm run format             # Format code with Prettier

# Docker Commands
npm run docker:build       # Build Docker image
npm run docker:up          # Start development containers
npm run docker:down        # Stop Docker containers
npm run docker:logs        # View container logs

# Production Docker Commands
docker-compose -f docker-compose.prod.yml up -d --build    # Build & start production
docker-compose -f docker-compose.prod.yml down             # Stop production
docker-compose -f docker-compose.prod.yml logs -f          # View production logs
docker-compose -f docker-compose.prod.yml ps               # Check service status
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/                 # Configuration modules
│   ├── common/                 # Shared resources
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   └── pipes/
│   ├── modules/
│   │   ├── auth/              # Authentication module
│   │   ├── users/             # User management
│   │   ├── ai/                # AI integration
│   │   ├── storage/           # File uploads
│   │   ├── email/             # Email service
│   │   └── health/            # Health checks
│   ├── database/              # Prisma & Redis services
│   ├── utils/                 # Utility functions
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/
├── docs/                      # Documentation
├── test/                      # Tests
├── uploads/                   # Uploaded files
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 📚 API Documentation

Swagger documentation is available at different URLs depending on your setup:

### Docker Stack (Port 8000)
- **Swagger UI**: http://localhost:8000/api-docs 
- **Swagger JSON**: http://localhost:8000/api-json
- **API Base**: http://localhost:8000/api/v1

### Local Development (Port 3000)  
- **Swagger UI**: http://localhost:3000/api-docs
- **Swagger JSON**: http://localhost:3000/api-json
- **API Base**: http://localhost:3000/api/v1

### Main Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

#### Users
- `GET /api/v1/users/me` - Get current user
- `PATCH /api/v1/users/me` - Update profile
- `DELETE /api/v1/users/me` - Delete account

#### AI (Coming Soon)
- `POST /api/v1/ai/chat` - Send chat message
- `POST /api/v1/ai/embeddings` - Generate embeddings
- `GET /api/v1/ai/conversations` - List conversations

#### Storage (Coming Soon)
- `POST /api/v1/storage/upload` - Upload file
- `GET /api/v1/storage/:fileId` - Download file

#### Health
- `GET /api/v1/health` - Overall health status

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Prevent abuse
- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt rounds
- **Input Validation** - class-validator
- **SQL Injection Protection** - Prisma ORM
- **XSS Protection** - Built-in sanitization

## 🎨 Code Quality

### Automated Tools

- **ESLint** - Linting with TypeScript support
- **Prettier** - Code formatting
- **Husky** - Git hooks automation
- **lint-staged** - Run linters on staged files only

### Pre-commit Hooks

Automatically runs on every commit:
```bash
# Runs ESLint and Prettier on staged files
git commit -m "feat(auth): add login endpoint"
```

### Conventional Commits

Enforced commit message format:
```bash
feat(scope): subject    # New feature
fix(scope): subject     # Bug fix
docs(scope): subject    # Documentation
style(scope): subject   # Formatting
refactor(scope): subject # Code refactoring
test(scope): subject    # Tests
chore(scope): subject   # Maintenance
```

### Run Code Quality Checks

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npx tsc --noEmit
```

See [Code Quality Guide](./docs/CODE_QUALITY.md) for detailed information.

## 📖 Documentation

Detailed documentation available in the `docs/` directory:

- [API Guidelines](./docs/API_GUIDELINES.md)
- [Endpoint Creation Guide](./docs/ENDPOINT_CREATION.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [Authentication Guide](./docs/AUTHENTICATION.md)
- [AI Integration](./docs/AI_INTEGRATION.md)
- [File Upload Guide](./docs/FILE_UPLOAD.md)
- [WebSocket Guide](./docs/WEBSOCKETS.md)
- [Email Service](./docs/EMAIL_SERVICE.md)
- [Background Jobs](./docs/BACKGROUND_JOBS.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Production CORS Setup](./docs/PRODUCTION_CORS.md)
- [Testing Guide](./docs/TESTING.md)
- [Code Quality Guide](./docs/CODE_QUALITY.md)

## 🚢 Deployment

### Production Environment Setup

**Important**: Before running production build, set up environment variables to avoid Docker build issues.

#### Step 1: Configure Environment Variables

```bash
# Copy the production template
cp env.prod.example .env.prod

# Edit .env.prod with your actual values
```

**Required Variables:**
```env
# Database Configuration (Required)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=backend_db

# JWT Configuration (Required - Use strong random strings)
JWT_SECRET=your_very_secure_jwt_secret_key_here_min_32_chars
JWT_REFRESH_SECRET=your_very_secure_jwt_refresh_secret_key_here_min_32_chars

# API Keys (Optional)
OPENAI_API_KEY=sk-your_openai_key
EMAIL_HOST=smtp.your-provider.com
EMAIL_USER=your_email@domain.com
EMAIL_PASSWORD=your_email_password
```

#### Step 2: Production Deployment

```bash
# Build and start all production services
docker-compose -f docker-compose.prod.yml up -d --build

# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

#### Step 3: Verify Deployment

- **API**: http://localhost:8000/api/v1
- **Health Check**: http://localhost:8000/api/v1/health
- **API Documentation**: http://localhost:8000/api-docs

### Environment Variables Reference

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `POSTGRES_USER` | `postgres` | Set in `.env.prod` | Database user |
| `POSTGRES_PASSWORD` | `password` | Set in `.env.prod` | Database password |
| `POSTGRES_DB` | `backend_db` | Set in `.env.prod` | Database name |
| `JWT_SECRET` | Development key | **Strong random string** | JWT signing secret |
| `JWT_REFRESH_SECRET` | Development key | **Strong random string** | JWT refresh secret |

### Docker Production Build (Alternative)

```bash
# Build production image
docker build -t backend-api .

# Run production container
docker run -p 8000:8000 --env-file .env.prod backend-api
```

**Note**: The production setup includes fixes for:
- Husky prepare script errors during Docker build
- PostgreSQL environment variable warnings
- Proper multi-stage Docker build optimization

For complete setup guide, see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

## 🐛 Troubleshooting

### Port Conflicts (EADDRINUSE Error)

**Port 8000 already in use (Docker):**
```bash
# Find and kill the process using port 8000
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Then restart Docker stack
docker-compose up -d
```

**Port 3000 already in use (Local Development):**
```bash
# Quick fix using new convenience scripts
npm run kill:port          # Kill port 3000 processes
npm run restart:dev        # Kill port 3000 and restart

# Manual approach (if needed)
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or change port in .env file
echo PORT=3001 >> .env
npm run start:dev
```

### Database Connection Issues

**For Docker Stack:**
```bash
# Check if all containers are running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart database service
docker-compose restart postgres

# Full restart if needed
docker-compose down && docker-compose up -d
```

**For Local Development:**
```bash
# Check if database container is running
docker-compose ps postgres

# Start database if stopped
docker-compose up -d postgres

# Check connection from host
docker-compose exec postgres psql -U postgres -d backend_db -c "SELECT 1"
```

### Redis Connection Issues
```bash
# Check Redis status
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# Should return "PONG"
```

### Prisma Issues
```bash
# Regenerate Prisma client
npx prisma generate

# View database schema
npx prisma studio

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate dev
```

### Application Won't Start

**Check logs for specific errors:**
```bash
# Docker logs
docker-compose logs app

# Local development
# Check terminal output for errors
```

**Common issues:**
- Missing environment variables (check `.env` file)
- Database connection failed (see Database Issues above)
- Port already in use (see Port Conflicts above)
- Missing dependencies (`npm install`)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- NestJS Team
- Prisma Team
- OpenAI
- All open-source contributors

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check documentation in `/docs`
- Review Swagger API documentation

---

**Built with ❤️ using NestJS**
