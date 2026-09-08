import { z } from 'zod';

export const WalletLookupResponseDtoSchema = z.object({
  credentialId: z.string(),
  walletAddress: z.string().length(56),
});

export type WalletLookupResponseDto = z.infer<typeof WalletLookupResponseDtoSchema>;
