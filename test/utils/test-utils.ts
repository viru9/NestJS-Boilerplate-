import { TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';
import type { Server } from 'http';

/**
 * Create a test application instance
 */
export async function createTestApp(
  module: TestingModule,
): Promise<INestApplication> {
  const app = module.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

/**
 * Get the HTTP server from the NestJS application with proper typing
 */
export function getHttpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}

/**
 * Clean up database after tests
 */
export async function cleanupDatabase(prisma: PrismaService) {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Mock Redis service for testing
 */
export class MockRedisService {
  private store = new Map<string, string>();
  private expiry = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    const exp = this.expiry.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.expiry.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(this.store.get(key) || null);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.store.set(key, value);
    if (ttl) {
      this.expiry.set(key, Date.now() + ttl * 1000);
    }
    return Promise.resolve();
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.expiry.delete(key);
    return Promise.resolve();
  }

  async exists(key: string): Promise<boolean> {
    return Promise.resolve(this.store.has(key));
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.expiry.clear();
    return Promise.resolve();
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}

/**
 * Generate random string
 */
export function randomString(length = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

/**
 * Generate random email
 */
export function randomEmail(): string {
  return `test-${randomString()}@example.com`;
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
