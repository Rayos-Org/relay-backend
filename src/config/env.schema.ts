import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),

  // Soroban RPC
  SOROBAN_RPC_URL: z.string().url(),

  // WebAuthn
  WEBAUTHN_RP_ID: z.string().min(1),
  WEBAUTHN_ORIGIN: z.string().url(),

  // Relay
  LAUNCHTUBE_API_KEY: z.string().optional(),

  // Notifications
  RESEND_API_KEY: z.string().optional(),
}).refine(data => data.REDIS_URL || (data.REDIS_HOST && data.REDIS_PORT), {
  message: "Either REDIS_URL or (REDIS_HOST and REDIS_PORT) must be provided",
  path: ["REDIS_URL"]
});

export type EnvSchema = z.infer<typeof envSchema>;
