import { z } from 'zod';

export const ProposeRecoveryDtoSchema = z.object({
  walletAddress: z.string().length(56),
  newSigner: z.string().length(56),
});

export type ProposeRecoveryDto = z.infer<typeof ProposeRecoveryDtoSchema>;

export const ApproveRecoveryDtoSchema = z.object({
  walletAddress: z.string().length(56),
  proposalId: z.string().min(1),
});

export type ApproveRecoveryDto = z.infer<typeof ApproveRecoveryDtoSchema>;

export const RecoveryStatusResponseDtoSchema = z.object({
  proposalId: z.string(),
  status: z.enum(['pending', 'approved', 'executed', 'cancelled', 'expired']),
  timelockExpiresAt: z.string().datetime(),
  approvals: z.array(
    z.object({
      guardianAddress: z.string(),
      approvedAt: z.string().datetime(),
    })
  ),
});

export type RecoveryStatusResponseDto = z.infer<typeof RecoveryStatusResponseDtoSchema>;
