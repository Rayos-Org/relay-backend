import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { SponsorService } from "./sponsor.service";
import { LaunchtubeStrategy } from "./strategies/launchtube.strategy";
import { IndexerService } from "../indexer/indexer.service";
import {
  DeployWalletDto,
  FaucetDto,
  SubmitTransactionDto,
  SubmitTransactionResponseDto,
} from "@common/schemas/relay.schema";

function base64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(
    Buffer.from(b64 + "=".repeat((4 - (b64.length % 4)) % 4), "base64"),
  );
}

@Injectable()
export class RelayService {
  private readonly logger = new Logger(RelayService.name);

  constructor(
    private readonly sponsor: SponsorService,
    private readonly launchtube: LaunchtubeStrategy,
    private readonly indexer: IndexerService,
  ) {}

  /** Public details clients need to build sponsored transactions. */
  info() {
    return {
      publicKey: this.sponsor.publicKey,
      networkPassphrase: this.sponsor.networkPassphrase,
      factoryContractId: this.sponsor.factoryContractId,
      nativeTokenContractId: this.sponsor.nativeTokenContractId,
      faucetAmount: this.sponsor.isTestnet
        ? String(this.sponsor.faucetAmountXlm)
        : undefined,
    };
  }

  /**
   * Deploy a GuardianWallet for a freshly registered passkey and record the
   * credential → wallet mapping used by sign-in.
   */
  async deployWallet(dto: DeployWalletDto) {
    const credentialIdBytes = base64urlToBytes(dto.credentialId);
    const publicKey = new Uint8Array(Buffer.from(dto.publicKeyHex, "hex"));
    const { walletAddress, txHash } = await this.sponsor.deployWallet(
      dto.saltHex,
      credentialIdBytes,
      publicKey,
    );
    await this.indexer.indexCredential(dto.credentialId, walletAddress);
    this.logger.log(
      `Deployed wallet ${walletAddress} for credential ${dto.credentialId} (tx ${txHash})`,
    );
    return { walletAddress, txHash };
  }

  /**
   * Submit a passkey-authorised transaction. If the relay has a sponsor
   * account the transaction must use it as source and the relay signs the
   * envelope; otherwise we fall back to Launchtube fee-bumping.
   */
  async submitTransaction(
    dto: SubmitTransactionDto,
  ): Promise<SubmitTransactionResponseDto> {
    if (this.sponsor.enabled) {
      const result = await this.sponsor.signAndSubmit(dto.signedXdr);
      if (result.status === "FAILED") {
        throw new BadRequestException(
          `Transaction ${result.txHash} failed on-chain`,
        );
      }
      return { txHash: result.txHash, status: result.status.toLowerCase() };
    }
    const result = await this.launchtube.sponsorAndSubmit(dto.signedXdr);
    return { txHash: result.txHash, status: result.status };
  }

  async faucet(dto: FaucetDto) {
    return this.sponsor.faucet(dto.walletAddress);
  }

  async getTransactionStatus(txHash: string) {
    try {
      return await this.sponsor.status(txHash);
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to fetch transaction status: ${error.message}`,
      );
    }
  }
}
