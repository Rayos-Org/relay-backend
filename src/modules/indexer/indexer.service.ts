import {
  Injectable,
  OnApplicationBootstrap,
  Logger,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { rpc } from "@stellar/stellar-sdk";
import Redis from "ioredis";
import { DATABASE_CONNECTION } from "@common/database/database.module";
import { REDIS_CLIENT } from "@common/redis/redis.module";
import * as schema from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class IndexerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IndexerService.name);
  private rpcServer: rpc.Server;
  private isPolling = false;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get<string>("SOROBAN_RPC_URL")!;
    this.rpcServer = new rpc.Server(rpcUrl);
  }

  onApplicationBootstrap() {
    this.logger.log("Starting Soroban event indexer...");
    // Start polling loop asynchronously
    this.pollEventsLoop();
  }

  private async pollEventsLoop() {
    if (this.isPolling) return;
    this.isPolling = true;

    while (true) {
      try {
        await this.fetchAndProcessEvents();
      } catch (error: any) {
        this.logger.error(`Error during event polling: ${error.message}`);
      }

      // Configurable polling interval, default 5s
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  private async fetchAndProcessEvents() {
    const cursorKey = "indexer:last_ledger";

    // Fetch latest network state
    const latestLedgerResponse = await this.rpcServer.getLatestLedger();
    const latestLedger = latestLedgerResponse.sequence;

    // Determine starting ledger (fallback to latest if no cursor exists)
    const storedCursor = await this.redisClient.get(cursorKey);
    const startLedger = storedCursor
      ? parseInt(storedCursor, 10)
      : latestLedger;

    if (startLedger > latestLedger) {
      return; // Already up to date
    }

    // Soroban RPC getEvents limits by max bounds (e.g. 10000 ledgers)
    // We fetch in chunks of 1000 to be safe.
    const endLedger = Math.min(startLedger + 1000, latestLedger);

    const response = await this.rpcServer.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          // In real implementation, filter by wallet factory / passkey policy contract IDs
          // contractIds: [this.configService.get('WALLET_FACTORY_ID')],
          topics: [
            // Matches topic `WalletRegistered` or `CredentialAdded`
            // Wait for @rayos/wallet-sdk to provide explicit xdr encoded topics
          ],
        },
      ],
      limit: 100,
    });

    if (response.events && response.events.length > 0) {
      for (const event of response.events) {
        await this.processEvent(event);
      }
    }

    // Persist cursor
    await this.redisClient.set(cursorKey, endLedger + 1);
  }

  private async processEvent(event: rpc.Api.EventResponse) {
    // 1. Decode event XDR to extract `credential_id` and `wallet_address`
    // This requires schema decoding from `@rayos/wallet-sdk`.
    // Placeholder implementation:
    const credentialId = "parsed_credential_id";
    const walletAddress = "parsed_wallet_address";

    if (!credentialId || !walletAddress) return;

    // 2. Upsert into database
    await this.db
      .insert(schema.credentialLookup)
      .values({
        credential_id: credentialId,
        wallet_address: walletAddress,
      })
      .onConflictDoUpdate({
        target: schema.credentialLookup.credential_id,
        set: { wallet_address: walletAddress, updated_at: new Date() },
      });

    this.logger.log(
      `Indexed credential ${credentialId} for wallet ${walletAddress}`,
    );
  }

  async getWalletByCredential(credentialId: string) {
    const [lookup] = await this.db
      .select()
      .from(schema.credentialLookup)
      .where(eq(schema.credentialLookup.credential_id, credentialId))
      .limit(1);

    return lookup ? lookup.wallet_address : null;
  }
}
