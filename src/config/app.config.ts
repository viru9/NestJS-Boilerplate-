import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
