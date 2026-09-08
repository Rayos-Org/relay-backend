import { z } from 'zod';

export const SubmitTransactionDtoSchema = z.object({
  signedXdr: z.string().min(1, 'Signed XDR cannot be empty'),
});

export type SubmitTransactionDto = z.infer<typeof SubmitTransactionDtoSchema>;

export const SubmitTransactionResponseDtoSchema = z.object({
  txHash: z.string(),
  status: z.string(),
});

export type SubmitTransactionResponseDto = z.infer<typeof SubmitTransactionResponseDtoSchema>;
