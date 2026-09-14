import { Injectable, Logger, Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DATABASE_CONNECTION } from "@common/database/database.module";
import * as schema from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Maps passkey credential ids to wallet contract addresses so a user can sign
 * in from any device with just their passkey.
 *
 * The mapping is written by the relay at deployment time (`POST /relay/deploy`)
 * — the factory contract does not emit events, so there is nothing to poll.
 */
@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async indexCredential(
    credentialId: string,
    walletAddress: string,
  ): Promise<void> {
    await this.db
      .insert(schema.credentialLookup)
      .values({ credential_id: credentialId, wallet_address: walletAddress })
      .onConflictDoUpdate({
        target: schema.credentialLookup.credential_id,
        set: { wallet_address: walletAddress, updated_at: new Date() },
      });
    this.logger.log(`Indexed credential ${credentialId} -> ${walletAddress}`);
  }

  async getWalletByCredential(credentialId: string): Promise<string | null> {
    const [lookup] = await this.db
      .select()
      .from(schema.credentialLookup)
      .where(eq(schema.credentialLookup.credential_id, credentialId))
      .limit(1);
    return lookup ? lookup.wallet_address : null;
  }
}
