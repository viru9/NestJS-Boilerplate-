import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  createTestApp,
  cleanupDatabase,
  randomEmail,
  getHttpServer,
} from './utils/test-utils';
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
    it('should register a new user', async () => {
      const registerDto = UserFactory.createRegisterDto();

      await request(getHttpServer(app))
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          expect(res.body.user).toHaveProperty('email', registerDto.email);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should fail with invalid email', async () => {
      const registerDto = UserFactory.createRegisterDto({
        email: 'invalid-email',
      });

      await request(getHttpServer(app))
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with weak password', async () => {
      const registerDto = UserFactory.createRegisterDto({
        password: '123',
      });

      await request(getHttpServer(app))
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with duplicate email', async () => {
      const registerDto = UserFactory.createRegisterDto();

      // First registration
      await request(getHttpServer(app))
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(201);

      // Duplicate registration
      await request(getHttpServer(app))
        .post('/api/v1/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    it('should login successfully', async () => {
      const password = 'Test123!';
      const userData = await UserFactory.create({ password });
      await prisma.user.create({ data: userData });

      await request(getHttpServer(app))
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          expect(res.body.user).toHaveProperty('email', userData.email);
        });
    });

    it('should fail with wrong password', async () => {
      const userData = await UserFactory.create();
      await prisma.user.create({ data: userData });

      await request(getHttpServer(app))
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent email', async () => {
      await request(getHttpServer(app))
        .post('/api/v1/auth/login')
        .send({
          email: randomEmail(),
          password: 'Test123!',
        })
        .expect(401);
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    it('should refresh access token', async () => {
      const registerDto = UserFactory.createRegisterDto();

      // Register
      const registerRes = await request(getHttpServer(app))
        .post('/api/v1/auth/register')
        .send(registerDto);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { refreshToken } = registerRes.body;

      // Refresh
      await request(getHttpServer(app))
        .post('/api/v1/auth/refresh')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          expect(res.body.refreshToken).not.toBe(refreshToken); // Token rotation
        });
    });

    it('should fail with invalid refresh token', async () => {
      await request(getHttpServer(app))
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('/api/v1/auth/logout (POST)', () => {
    it('should logout successfully', async () => {
      const registerDto = UserFactory.createRegisterDto();

      // Register
      const registerRes = await request(getHttpServer(app))
        .post('/api/v1/auth/register')
        .send(registerDto);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { refreshToken } = registerRes.body;

      // Logout
      await request(getHttpServer(app))
        .post('/api/v1/auth/logout')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        .send({ refreshToken })
        .expect(200);

      // Try to refresh with logged out token
      await request(getHttpServer(app))
        .post('/api/v1/auth/refresh')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Protected routes', () => {
    it('should access protected route with valid token', async () => {
      const registerDto = UserFactory.createRegisterDto();

      // Register
      const registerRes = await request(getHttpServer(app))
        .post('/api/v1/auth/register')
        .send(registerDto);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { accessToken } = registerRes.body;

      // Access protected route
      await request(getHttpServer(app))
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', registerDto.email);
        });
    });

    it('should fail to access protected route without token', async () => {
      await request(getHttpServer(app)).get('/api/v1/users/me').expect(401);
    });

    it('should fail to access protected route with invalid token', async () => {
      await request(getHttpServer(app))
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
