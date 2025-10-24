import { registerAs } from '@nestjs/config';

export default registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  traceSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || '1.0'),
  enabled: !!process.env.SENTRY_DSN,
}));
