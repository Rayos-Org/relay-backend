import { z } from "zod";

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
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

    // Stellar / contracts
    STELLAR_NETWORK_PASSPHRASE: z
      .string()
      .default("Test SDF Network ; September 2015"),
    FACTORY_CONTRACT_ID: z.string().length(56).optional(),
    NATIVE_TOKEN_CONTRACT_ID: z.string().length(56).optional(),

    // Relay sponsor account (S...). Pays fees, deploys wallets, testnet faucet.
    RELAY_SECRET_KEY: z
      .string()
      .regex(/^S[A-Z2-7]{55}$/)
      .optional(),
    RELAY_FAUCET_XLM: z.coerce.number().default(100),
    RELAY_MIN_BALANCE_XLM: z.coerce.number().default(500),
    LAUNCHTUBE_API_KEY: z.string().optional(),

    // CORS: comma-separated browser origins allowed to call the API
    CORS_ORIGINS: z.string().optional(),

    // Notifications
    RESEND_API_KEY: z.string().optional(),
  })
  .refine((data) => data.REDIS_URL || (data.REDIS_HOST && data.REDIS_PORT), {
    message: "Either REDIS_URL or (REDIS_HOST and REDIS_PORT) must be provided",
    path: ["REDIS_URL"],
  });

export type EnvSchema = z.infer<typeof envSchema>;
