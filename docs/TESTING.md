# Testing Guide

Comprehensive guide for testing the backend application with unit tests, integration tests, and end-to-end (E2E) tests.

## Overview

**Testing Framework:** Jest  
**E2E Testing:** Supertest  
**Test Database:** PostgreSQL (separate test instance)  
**Mocking:** Jest mocks + custom mock factories  
**Coverage Target:** 80%+

## Test Structure

```
test/
├── jest-e2e.json              # E2E test configuration
├── utils/
│   └── test-utils.ts          # Test utilities
├── factories/
│   └── user.factory.ts        # Mock data factories
├── auth.e2e-spec.ts           # Auth E2E tests
├── users.e2e-spec.ts          # Users E2E tests
└── ai.e2e-spec.ts             # AI E2E tests

src/
└── modules/
    ├── auth/
    │   ├── auth.service.spec.ts         # Unit tests
    │   └── auth.controller.spec.ts      # Controller tests
    ├── users/
    │   ├── users.service.spec.ts
    │   └── users.controller.spec.ts
    └── ai/
        ├── services/
        │   └── openai.service.spec.ts
        └── ai.controller.spec.ts
```

## Running Tests

### All Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:cov

# E2E tests only
npm run test:e2e
```

### Specific Tests

```bash
# Run specific file
npm test -- auth.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should login"

# Run tests in specific directory
npm test -- src/modules/auth
```

### Coverage

```bash
# Generate coverage report
npm run test:cov

# Open coverage report
open coverage/lcov-report/index.html
```

## Unit Testing

### Service Tests

Test business logic in isolation with mocked dependencies.

**Example:** `auth.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import { UserFactory } from '../../../test/factories/user.factory';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mock-jwt-token'),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = UserFactory.createRegisterDto();
      const mockUser = await UserFactory.create();

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerDto.email);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      const registerDto = UserFactory.createRegisterDto();
      const existingUser = await UserFactory.create();

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(existingUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const password = 'Test123!';
      const mockUser = await UserFactory.create({ password });

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser as any);

      const result = await service.login({
        email: mockUser.email,
        password,
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      const mockUser = await UserFactory.create();

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      await expect(
        service.login({
          email: mockUser.email,
          password: 'WrongPassword',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Controller Tests

Test HTTP request handling with mocked services.

**Example:** `auth.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserFactory } from '../../../test/factories/user.factory';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = UserFactory.createRegisterDto();
      const mockResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: registerDto.email },
      };

      jest.spyOn(service, 'register').mockResolvedValue(mockResponse as any);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockResponse);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto = UserFactory.createLoginDto();
      const mockResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: loginDto.email },
      };

      jest.spyOn(service, 'login').mockResolvedValue(mockResponse as any);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockResponse);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });
});
```

## Integration Testing

### Module Integration Tests

Test multiple components working together.

**Example:** `auth.integration.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { DatabaseModule } from '../../database/database.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';
import { cleanupDatabase, UserFactory } from '../../../test/utils';

describe('Auth Module (Integration)', () => {
  let module: TestingModule;
  let authService: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        AuthModule,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should complete full registration flow', async () => {
    const registerDto = UserFactory.createRegisterDto();

    // Register
    const authResponse = await authService.register(registerDto);

    expect(authResponse).toHaveProperty('accessToken');
    expect(authResponse).toHaveProperty('refreshToken');

    // Verify user was created
    const user = await prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    expect(user).toBeDefined();
    expect(user.email).toBe(registerDto.email);
  });

  it('should complete login and refresh flow', async () => {
    const password = 'Test123!';
    const registerDto = UserFactory.createRegisterDto({ password });

    // Register
    await authService.register(registerDto);

    // Login
    const loginResponse = await authService.login({
      email: registerDto.email,
      password,
    });

    expect(loginResponse).toHaveProperty('accessToken');
    expect(loginResponse).toHaveProperty('refreshToken');

    // Refresh token
    const refreshResponse = await authService.refreshToken({
      refreshToken: loginResponse.refreshToken,
    });

    expect(refreshResponse).toHaveProperty('accessToken');
    expect(refreshResponse).toHaveProperty('refreshToken');
    expect(refreshResponse.refreshToken).not.toBe(loginResponse.refreshToken);
  });
});
```

## E2E Testing

### Complete API Tests

Test entire API endpoints with real HTTP requests.

**Example:** `auth.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { createTestApp, cleanupDatabase } from './utils/test-utils';
import { UserFactory } from './factories/user.factory';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await createTestApp(moduleFixture);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register successfully', () => {
      const registerDto = UserFactory.createRegisterDto();

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should validate email format', () => {
      const registerDto = UserFactory.createRegisterDto({
        email: 'invalid-email',
      });

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('Protected route access', () => {
    it('should access with valid token', async () => {
      const registerDto = UserFactory.createRegisterDto();

      // Register
      const registerRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(registerDto);

      const { accessToken } = registerRes.body;

      // Access protected route
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
```

### WebSocket E2E Tests

**Example:** `ai-websocket.e2e-spec.ts`

```typescript
import { io, Socket } from 'socket.io-client';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { waitFor } from './utils/test-utils';

describe('AI WebSocket (e2e)', () => {
  let app: INestApplication;
  let socket: Socket;
  let accessToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.listen(3001);

    // Get access token
    // ... register/login logic
  });

  afterEach(() => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect to AI gateway', (done) => {
    socket = io('http://localhost:3001/ai', {
      auth: { token: accessToken },
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      done();
    });
  });

  it('should receive streaming chat response', (done) => {
    socket = io('http://localhost:3001/ai', {
      auth: { token: accessToken },
    });

    let receivedChunks = 0;

    socket.on('chat:message', (data) => {
      receivedChunks++;
      expect(data).toHaveProperty('content');
    });

    socket.on('chat:end', () => {
      expect(receivedChunks).toBeGreaterThan(0);
      done();
    });

    socket.emit('chat:start', {
      userId: 'test-user-id',
      message: 'Hello AI',
    });
  }, 30000);
});
```

## Test Utilities

### Mock Factories

**User Factory:** `test/factories/user.factory.ts`

```typescript
export class UserFactory {
  static async create(options = {}) {
    return {
      email: options.email || randomEmail(),
      password: await bcrypt.hash(options.password || 'Test123!', 10),
      firstName: options.firstName || 'Test',
      lastName: options.lastName || 'User',
      role: options.role || Role.USER,
    };
  }

  static createRegisterDto(overrides = {}) {
    return {
      email: overrides.email || randomEmail(),
      password: overrides.password || 'Test123!',
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
    };
  }
}
```

### Test Helpers

**Database Cleanup:**

```typescript
export async function cleanupDatabase(prisma: PrismaService) {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
}
```

**Wait Helper:**

```typescript
export async function waitFor(condition: () => boolean, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await delay(100);
  }
  throw new Error('Timeout waiting for condition');
}
```

## Mocking

### Database Mocking

```typescript
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
```

### External Service Mocking

**OpenAI Service:**

```typescript
const mockOpenAIService = {
  generateCompletion: jest.fn().mockResolvedValue({
    content: 'Mock AI response',
    tokens: 100,
    model: 'gpt-4',
  }),
  generateStreamingCompletion: jest.fn().mockImplementation(async function* () {
    yield { content: 'Mock ', model: 'gpt-4' };
    yield { content: 'response', model: 'gpt-4' };
  }),
};
```

**Email Service:**

```typescript
const mockEmailService = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
};
```

### Redis Mocking

```typescript
class MockRedisService {
  private store = new Map<string, string>();

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async clear() {
    this.store.clear();
  }
}
```

## Test Configuration

### Jest Config

**`package.json`:**

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

### E2E Config

**`test/jest-e2e.json`:**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "testTimeout": 30000
}
```

### Environment Variables

**`.env.test`:**

```env
NODE_ENV=test
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/backend_test"
REDIS_HOST=localhost
REDIS_PORT=6380
JWT_SECRET=test-secret
JWT_REFRESH_SECRET=test-refresh-secret
```

## Best Practices

### 1. Test Organization

- ✅ Group tests by describe blocks
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ One assertion per test (when possible)

```typescript
describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user', async () => {
      // Arrange
      const registerDto = UserFactory.createRegisterDto();

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
    });
  });
});
```

### 2. Test Independence

Each test should be independent:

```typescript
afterEach(async () => {
  await cleanupDatabase(prisma);
  jest.clearAllMocks();
});
```

### 3. Use Factories

Don't repeat test data:

```typescript
// ❌ Bad
const user = {
  email: 'test@example.com',
  password: 'Test123!',
  firstName: 'Test',
  lastName: 'User',
};

// ✅ Good
const user = UserFactory.create();
```

### 4. Test Edge Cases

```typescript
it('should handle empty email', () => {
  expect(() => service.register({ email: '' })).toThrow();
});

it('should handle SQL injection attempt', () => {
  expect(() => service.register({ email: "'; DROP TABLE users--" })).toThrow();
});
```

### 5. Use Meaningful Assertions

```typescript
// ❌ Bad
expect(result).toBeTruthy();

// ✅ Good
expect(result).toHaveProperty('accessToken');
expect(result.user.email).toBe(registerDto.email);
```

## Coverage

### Generating Reports

```bash
npm run test:cov
```

### Coverage Thresholds

Configure in `package.json`:

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Viewing Reports

```bash
# HTML report
open coverage/lcov-report/index.html

# Terminal summary
npm run test:cov
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run test:cov
      - run: npm run test:e2e
```

## Troubleshooting

### Tests Hanging

```bash
# Add timeout
jest.setTimeout(30000);

# Or in specific test
it('should complete', async () => {
  // ...
}, 30000);
```

### Database Connection Issues

```bash
# Check connection
npx prisma db pull

# Reset test database
NODE_ENV=test npx prisma migrate reset
```

### Flaky Tests

```bash
# Run tests multiple times
npm test -- --runInBand --detectOpenHandles
```

## Summary

**Test Coverage:**
- ✅ Unit tests for all services
- ✅ Controller tests for all endpoints
- ✅ Integration tests for modules
- ✅ E2E tests for critical flows
- ✅ WebSocket tests for real-time features

**Test Utilities:**
- ✅ Mock factories for test data
- ✅ Database cleanup helpers
- ✅ Mock services for external dependencies
- ✅ Test app creation helpers

**Best Practices:**
- ✅ Independent tests
- ✅ Clear naming
- ✅ AAA pattern
- ✅ Edge case coverage
- ✅ 80%+ code coverage

The testing infrastructure is complete and production-ready!

