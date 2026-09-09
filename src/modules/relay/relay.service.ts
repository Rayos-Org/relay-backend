import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  rpc,
  TransactionBuilder,
  Networks,
  Transaction,
} from "@stellar/stellar-sdk";
import { LaunchtubeStrategy } from "./strategies/launchtube.strategy";
import {
  SubmitTransactionDto,
  SubmitTransactionResponseDto,
} from "@common/schemas/relay.schema";

@Injectable()
export class RelayService {
  private rpcServer: rpc.Server;

  constructor(
    private configService: ConfigService,
    private launchtubeStrategy: LaunchtubeStrategy,
  ) {
    const rpcUrl = this.configService.get<string>("SOROBAN_RPC_URL")!;
    this.rpcServer = new rpc.Server(rpcUrl);
  }

  async submitTransaction(
    dto: SubmitTransactionDto,
  ): Promise<SubmitTransactionResponseDto> {
    try {
      // 1. Validate XDR shape
      // We parse the transaction to ensure it's a valid XDR and extract the source account (wallet address)
      const tx = TransactionBuilder.fromXDR(
        dto.signedXdr,
        Networks.TESTNET,
      ) as Transaction;
      const walletAddress = tx.source;

      if (!walletAddress) {
        throw new Error("Transaction must have a source account");
      }

      // 2. We use Launchtube as our primary sponsorship strategy for now.
      // The strategy pattern allows us to easily inject a FallbackStrategy here later.
      const result = await this.launchtubeStrategy.sponsorAndSubmit(
        dto.signedXdr,
      );

      return {
        txHash: result.txHash,
        status: result.status,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to process transaction: ${error.message}`,
      );
    }
  }

  async getTransactionStatus(txHash: string) {
    try {
      const response = await this.rpcServer.getTransaction(txHash);
      return {
        txHash,
        status: response.status,
        resultXdr: "resultXdr" in response ? response.resultXdr : null,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to fetch transaction status: ${error.message}`,
      );
    }
  }
}
