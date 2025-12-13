import { z } from 'zod';

export const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('glyphHash'),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Clerk
  CLERK_SECRET_KEY: z.string(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),

  // Hedera
  HEDERA_NETWORK: z.enum(['mainnet', 'testnet', 'previewnet']).default('testnet'),
  HEDERA_OPERATOR_ID: z.string(),
  HEDERA_OPERATOR_KEY: z.string(),
  HEDERA_MIRROR_NODE_URL: z.string().url(),
  HEDERA_USDC_TOKEN_ID: z.string(),

  // AWS
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_ENDPOINT: z.string().url().optional(),
  S3_BUCKET_NAME: z.string(),

  // Rate Limiting
  RATE_LIMIT_TTL: z.coerce.number().default(60),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Encryption
  MASTER_ENCRYPTION_KEY: z.string().min(32),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRATION: z.string().default('7d'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, any>): Env {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

export const constants = {
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  CACHE_TTL: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
  },
  FILE_UPLOAD: {
    MAX_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_TYPES: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/json',
      'application/zip',
    ],
  },
  HEDERA: {
    HCS_SUBMIT_KEY_REQUIRED: true,
    MAX_MESSAGE_SIZE: 1024, // bytes
    TOPIC_MEMO: 'glyphHash Compliance Topic',
  },
  USDC: {
    DECIMALS: 6,
    DEFAULT_PAYMENT_AMOUNT: '0.01', // $0.01 per log
  },
};
