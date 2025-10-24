export const RATE_LIMIT = {
  GLOBAL: {
    TTL: 60,
    LIMIT: 100,
  },
  AUTH: {
    TTL: 60,
    LIMIT: 5,
  },
  AI: {
    TTL: 60,
    LIMIT: 20,
  },
};

export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
};

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIMES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
};

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
};

export const QUEUE_NAMES = {
  EMAIL: 'email',
  AI_TASKS: 'ai-tasks',
};
