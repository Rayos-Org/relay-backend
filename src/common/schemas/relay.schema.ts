import { z } from "zod";

export const SubmitTransactionDtoSchema = z.object({
  signedXdr: z.string().min(1, "Signed XDR cannot be empty"),
});
export type SubmitTransactionDto = z.infer<typeof SubmitTransactionDtoSchema>;

export const SubmitTransactionResponseDtoSchema = z.object({
  txHash: z.string(),
  status: z.string(),
});
export type SubmitTransactionResponseDto = z.infer<
  typeof SubmitTransactionResponseDtoSchema
>;

export const DeployWalletDtoSchema = z.object({
  saltHex: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "saltHex must be 32 bytes hex"),
  credentialId: z.string().min(1).describe("base64url credential id"),
  publicKeyHex: z
    .string()
    .regex(
      /^04[0-9a-fA-F]{128}$/,
      "publicKeyHex must be an uncompressed P-256 key",
    ),
});
export type DeployWalletDto = z.infer<typeof DeployWalletDtoSchema>;

export const FaucetDtoSchema = z.object({
  walletAddress: z.string().length(56),
});
export type FaucetDto = z.infer<typeof FaucetDtoSchema>;
