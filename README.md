# Backend API - NestJS Boilerplate

Production-ready backend boilerplate built with NestJS, featuring authentication, AI integration, file uploads, real-time communication, and comprehensive tooling.

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

## 🛠️ Installation

### Option 1: Using Docker (Recommended)

1. **Clone the repository**
```bash
cd backend
```

2. **Create environment file**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start all services**
```bash
docker-compose up -d
```

4. **Run database migrations**
```bash
docker-compose exec app npx prisma migrate dev
```

5. **Access the application**
- API: http://localhost:3000/api/v1
- Swagger Docs: http://localhost:3000/api-docs

### Option 2: Local Development

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start PostgreSQL and Redis**
```bash
# Make sure PostgreSQL and Redis are running locally
```

4. **Run Prisma migrations**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Start the development server**
```bash
npm run start:dev
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

# Docker
npm run docker:build       # Build Docker image
npm run docker:up          # Start Docker containers
npm run docker:down        # Stop Docker containers
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

Once the application is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Swagger JSON**: http://localhost:3000/api-json

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
- [Testing Guide](./docs/TESTING.md)
- [Code Quality Guide](./docs/CODE_QUALITY.md)

## 🚢 Deployment

### Docker Production Build

```bash
# Build production image
docker build -t backend-api .

# Run production container
docker run -p 3000:3000 --env-file .env backend-api
```

### Using Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Redis Connection Issues
```bash
# Check Redis connection
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Prisma Issues
```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

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
