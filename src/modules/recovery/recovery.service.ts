import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import * as schema from "../../drizzle/schema";
import { DATABASE_CONNECTION } from "@common/database/database.module";
import {
  ProposeRecoveryDto,
  ApproveRecoveryDto,
} from "@common/schemas/recovery.schema";
import { WebAuthnService } from "../webauthn/webauthn.service";
import * as crypto from "crypto";

@Injectable()
export class RecoveryService {
  private readonly GUARDIAN_THRESHOLD = 2; // e.g. 2 of M guardians needed
  private readonly TIMELOCK_HOURS = 24;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @InjectQueue("recovery") private readonly recoveryQueue: Queue,
    private readonly webAuthnService: WebAuthnService,
  ) {}

  async proposeRecovery(dto: ProposeRecoveryDto) {
    // Note: In real app, we verify caller owns the wallet via WebAuthn or it's a sponsor requesting.
    const proposalId = crypto.randomBytes(16).toString("hex");
    const timelockExpiresAt = new Date();
    timelockExpiresAt.setHours(
      timelockExpiresAt.getHours() + this.TIMELOCK_HOURS,
    );

    await this.db.insert(schema.recoveryProposals).values({
      proposal_id: proposalId,
      wallet_address: dto.walletAddress,
      new_signer: dto.newSigner,
      approvals: [],
      timelock_expires_at: timelockExpiresAt,
      status: "pending",
    });

    // Determine guardians from on-chain state or indexer
    const guardians = [
      "guardian_address_1",
      "guardian_address_2",
      "guardian_address_3",
    ]; // Mocked

    // Enqueue notifications
    for (const guardianAddress of guardians) {
      await this.recoveryQueue.add("notify-guardian", {
        guardianAddress,
        proposalId,
        walletAddress: dto.walletAddress,
        newSigner: dto.newSigner,
        timelockExpiresAt,
      });
    }

    // Schedule expiration
    await this.recoveryQueue.add(
      "expire-proposal",
      { proposalId },
      { delay: this.TIMELOCK_HOURS * 3600 * 1000 + 3600000 },
    ); // Expire 1 hour after timelock

    return { proposalId, timelockExpiresAt: timelockExpiresAt.toISOString() };
  }

  async approveRecovery(dto: ApproveRecoveryDto) {
    const [proposal] = await this.db
      .select()
      .from(schema.recoveryProposals)
      .where(eq(schema.recoveryProposals.proposal_id, dto.proposalId))
      .limit(1);

    if (!proposal) {
      throw new BadRequestException("Proposal not found");
    }

    if (proposal.status !== "pending") {
      throw new BadRequestException(`Proposal is already ${proposal.status}`);
    }

    const approvals = proposal.approvals as any[];

    // In real app: verify caller is indeed the guardian and authorized the action (e.g. via WebAuthn)
    // Here we assume caller verification is done at controller or guard level.

    const callerAddress = "guardian_address_1"; // Mocked caller

    if (approvals.find((a) => a.guardianAddress === callerAddress)) {
      throw new BadRequestException("Guardian already approved");
    }

    approvals.push({
      guardianAddress: callerAddress,
      approvedAt: new Date().toISOString(),
    });

    let newStatus = proposal.status;

    if (approvals.length >= this.GUARDIAN_THRESHOLD) {
      newStatus = "approved";

      const timeRemaining = proposal.timelock_expires_at.getTime() - Date.now();
      const delay = timeRemaining > 0 ? timeRemaining : 0;

      await this.recoveryQueue.add(
        "execute-recovery",
        { proposalId: dto.proposalId },
        { delay },
      );
    }

    await this.db
      .update(schema.recoveryProposals)
      .set({ approvals, status: newStatus, updated_at: new Date() })
      .where(eq(schema.recoveryProposals.proposal_id, dto.proposalId));

    return { approvalsCount: approvals.length, status: newStatus };
  }

  async getRecoveryStatus(proposalId: string) {
    const [proposal] = await this.db
      .select()
      .from(schema.recoveryProposals)
      .where(eq(schema.recoveryProposals.proposal_id, proposalId))
      .limit(1);

    if (!proposal) {
      throw new BadRequestException("Proposal not found");
    }

    return {
      proposalId: proposal.proposal_id,
      status: proposal.status,
      timelockExpiresAt: proposal.timelock_expires_at.toISOString(),
      approvals: proposal.approvals,
    };
  }
}
