import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import { writeFileSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Sentry initialization
  if (configService.get<boolean>('sentry.enabled')) {
    Sentry.init({
      dsn: configService.get<string>('sentry.dsn'),
      environment: configService.get<string>('sentry.environment'),
      tracesSampleRate: configService.get<number>('sentry.traceSampleRate'),
    });
    logger.log('Sentry error tracking enabled');
  }

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    credentials: configService.get<boolean>('app.corsCredentials'),
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? '/api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Backend API')
    .setDescription('Backend API Documentation with AI Integration')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('AI', 'AI chat, embeddings, and conversations')
    .addTag('Storage', 'File upload and management')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Export swagger JSON
  if (process.env.NODE_ENV === 'development') {
    writeFileSync(
      './docs/api-specs/v1/swagger.json',
      JSON.stringify(document, null, 2),
    );
    logger.log('Swagger JSON exported to docs/api-specs/v1/swagger.json');
  }

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api-docs`);
  logger.log(
    `API endpoints available at: http://localhost:${port}${apiPrefix}`,
  );
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  process.exit(1);
});
