import { z } from "zod";

export const CreateSessionDtoSchema = z.object({
  walletAddress: z.string().length(56),
  scope: z.string().min(1),
  expiresAt: z.string().datetime(),
  signature: z.string().min(1), // To verify caller
});

export type CreateSessionDto = z.infer<typeof CreateSessionDtoSchema>;

export const SessionResponseDtoSchema = z.object({
  sessionId: z.string(),
  walletAddress: z.string(),
  scope: z.string(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type SessionResponseDto = z.infer<typeof SessionResponseDtoSchema>;
