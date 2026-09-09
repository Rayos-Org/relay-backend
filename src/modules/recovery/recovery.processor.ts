import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger, Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import { DATABASE_CONNECTION } from "@common/database/database.module";
import { ResendNotificationProvider } from "./notifications/resend.notification";
import { RelayService } from "../relay/relay.service";
import { GuardianAlertData } from "./notifications/notification.interface";

@Processor("recovery")
export class RecoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(RecoveryProcessor.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly notificationProvider: ResendNotificationProvider,
    private readonly relayService: RelayService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case "notify-guardian":
        return this.handleNotifyGuardian(job.data as GuardianAlertData);
      case "execute-recovery":
        return this.handleExecuteRecovery(job.data.proposalId);
      case "expire-proposal":
        return this.handleExpireProposal(job.data.proposalId);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleNotifyGuardian(data: GuardianAlertData) {
    await this.notificationProvider.sendGuardianAlert(data);
  }

  private async handleExecuteRecovery(proposalId: string) {
    const [proposal] = await this.db
      .select()
      .from(schema.recoveryProposals)
      .where(eq(schema.recoveryProposals.proposal_id, proposalId))
      .limit(1);

    if (!proposal || proposal.status !== "approved") {
      this.logger.log(
        `Skipping execution for proposal ${proposalId} (status: ${proposal?.status})`,
      );
      return;
    }

    if (new Date() < proposal.timelock_expires_at) {
      this.logger.warn(`Timelock has not expired for proposal ${proposalId}`);
      throw new Error("Timelock active");
    }

    // In a real scenario, this builds the final `approve_recovery` XDR, signs it with the sponsor,
    // and submits it via relayService.
    const mockSignedXdr = "...";
    try {
      await this.relayService.submitTransaction({ signedXdr: mockSignedXdr });

      // Update DB status
      await this.db
        .update(schema.recoveryProposals)
        .set({ status: "executed", updated_at: new Date() })
        .where(eq(schema.recoveryProposals.proposal_id, proposalId));

      this.logger.log(`Successfully executed recovery proposal ${proposalId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to execute recovery proposal ${proposalId}: ${error.message}`,
      );
      throw error; // Will be retried by BullMQ
    }
  }

  private async handleExpireProposal(proposalId: string) {
    const [proposal] = await this.db
      .select()
      .from(schema.recoveryProposals)
      .where(eq(schema.recoveryProposals.proposal_id, proposalId))
      .limit(1);

    if (
      proposal &&
      (proposal.status === "pending" || proposal.status === "approved")
    ) {
      await this.db
        .update(schema.recoveryProposals)
        .set({ status: "expired", updated_at: new Date() })
        .where(eq(schema.recoveryProposals.proposal_id, proposalId));
      this.logger.log(`Expired recovery proposal ${proposalId}`);
    }
  }
}
