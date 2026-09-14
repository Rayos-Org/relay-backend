import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

export const TESTNET_NATIVE_SAC =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const FRIENDBOT = "https://friendbot.stellar.org";
const STROOPS = 10_000_000n;

export interface SubmitResult {
  txHash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  resultValue?: xdr.ScVal;
}

/**
 * The relay's funded Stellar account. It pays for every transaction the
 * wallet users authorise with a passkey (fee sponsorship), deploys wallets
 * through the factory, and — on testnet — acts as a faucet.
 *
 * Configure `RELAY_SECRET_KEY` (S…). On testnet the account is auto-funded
 * from Friendbot whenever its balance drops below `RELAY_MIN_BALANCE_XLM`.
 */
@Injectable()
export class SponsorService implements OnModuleInit {
  private readonly logger = new Logger(SponsorService.name);
  readonly server: rpc.Server;
  readonly networkPassphrase: string;
  readonly factoryContractId: string;
  readonly nativeTokenContractId: string;
  readonly faucetAmountXlm: number;
  private readonly minBalanceXlm: number;
  private readonly keypair?: Keypair;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = this.config.get<string>("SOROBAN_RPC_URL")!;
    this.server = new rpc.Server(rpcUrl, {
      allowHttp: rpcUrl.startsWith("http://"),
    });
    this.networkPassphrase =
      this.config.get<string>("STELLAR_NETWORK_PASSPHRASE") || Networks.TESTNET;
    this.factoryContractId =
      this.config.get<string>("FACTORY_CONTRACT_ID") || "";
    this.nativeTokenContractId =
      this.config.get<string>("NATIVE_TOKEN_CONTRACT_ID") || TESTNET_NATIVE_SAC;
    this.faucetAmountXlm = Number(
      this.config.get<string>("RELAY_FAUCET_XLM") || 100,
    );
    this.minBalanceXlm = Number(
      this.config.get<string>("RELAY_MIN_BALANCE_XLM") || 500,
    );

    const secret = this.config.get<string>("RELAY_SECRET_KEY");
    if (secret) {
      this.keypair = Keypair.fromSecret(secret);
    } else {
      this.logger.warn(
        "RELAY_SECRET_KEY not set — sponsored deploy/submit/faucet endpoints are disabled.",
      );
    }
  }

  async onModuleInit() {
    if (!this.keypair) return;
    try {
      await this.ensureFunded();
      this.logger.log(`Sponsor account ${this.publicKey} ready`);
    } catch (e: any) {
      this.logger.error(`Sponsor account check failed: ${e.message}`);
    }
  }

  get enabled(): boolean {
    return !!this.keypair;
  }

  get publicKey(): string {
    if (!this.keypair)
      throw new ServiceUnavailableException(
        "Relay sponsor account is not configured",
      );
    return this.keypair.publicKey();
  }

  get isTestnet(): boolean {
    return this.networkPassphrase === Networks.TESTNET;
  }

  private requireKeypair(): Keypair {
    if (!this.keypair)
      throw new ServiceUnavailableException(
        "Relay sponsor account is not configured",
      );
    return this.keypair;
  }

  /** Native balance of a G… or C… address in stroops (SAC `balance`). */
  async balanceOf(address: string): Promise<bigint> {
    const retval = await this.simulateRead(
      this.nativeTokenContractId,
      "balance",
      new Address(address).toScVal(),
    );
    return BigInt(scValToNative(retval));
  }

  /** Testnet: top the sponsor up from Friendbot when it runs low. */
  async ensureFunded(): Promise<void> {
    const kp = this.requireKeypair();
    let exists = true;
    try {
      await this.server.getAccount(kp.publicKey());
    } catch {
      exists = false;
    }
    const balance = exists ? await this.balanceOf(kp.publicKey()) : 0n;
    if (balance >= BigInt(this.minBalanceXlm) * STROOPS) return;
    if (!this.isTestnet) {
      throw new ServiceUnavailableException(
        `Sponsor balance ${Number(balance) / 1e7} XLM is below the minimum; fund ${kp.publicKey()}`,
      );
    }
    this.logger.log(
      `Sponsor balance ${Number(balance) / 1e7} XLM — requesting Friendbot top-up`,
    );
    const res = await fetch(
      `${FRIENDBOT}?addr=${encodeURIComponent(kp.publicKey())}`,
    );
    if (!res.ok && res.status !== 400) {
      // 400 = account already funded (Friendbot only funds once); other codes are real failures.
      throw new ServiceUnavailableException(
        `Friendbot funding failed (${res.status})`,
      );
    }
  }

  private async simulateRead(
    contractId: string,
    method: string,
    ...args: xdr.ScVal[]
  ): Promise<xdr.ScVal> {
    const tx = new TransactionBuilder(
      new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0",
      ),
      { fee: BASE_FEE, networkPassphrase: this.networkPassphrase },
    )
      .addOperation(new Contract(contractId).call(method, ...args))
      .setTimeout(30)
      .build();
    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim))
      throw new BadRequestException(
        `Simulation of ${method} failed: ${sim.error}`,
      );
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result)
      throw new BadRequestException(`Simulation of ${method} returned nothing`);
    return sim.result.retval;
  }

  /** Build, simulate, sign and submit a contract call paid by the sponsor. */
  async invoke(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<SubmitResult> {
    const kp = this.requireKeypair();
    const source = await this.server.getAccount(kp.publicKey());
    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(new Contract(contractId).call(method, ...args))
      .setTimeout(120)
      .build();
    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new BadRequestException(
        `${method} simulation failed: ${sim.error}`,
      );
    }
    const assembled = rpc.assembleTransaction(tx, sim).build();
    assembled.sign(kp);
    return this.sendAndWait(assembled);
  }

  /**
   * Accept a transaction whose source is the sponsor and whose Soroban auth
   * entries are already signed by the user's passkey; sign the envelope and
   * submit it. The relay never signs arbitrary operations for other sources.
   */
  async signAndSubmit(signedXdr: string): Promise<SubmitResult> {
    const kp = this.requireKeypair();
    let tx: Transaction;
    try {
      tx = TransactionBuilder.fromXDR(
        signedXdr,
        this.networkPassphrase,
      ) as Transaction;
    } catch (e: any) {
      throw new BadRequestException(`Invalid transaction XDR: ${e.message}`);
    }
    if (!(tx instanceof Transaction))
      throw new BadRequestException("Fee-bump envelopes are not accepted");
    if (tx.source !== kp.publicKey()) {
      throw new BadRequestException(
        "Transaction source must be the relay sponsor account (see GET /relay/info)",
      );
    }
    if (
      tx.operations.length !== 1 ||
      tx.operations[0].type !== "invokeHostFunction"
    ) {
      throw new BadRequestException(
        "Only single invokeHostFunction transactions are sponsored",
      );
    }
    // Simulating again proves the passkey signature verifies on-chain before we pay for it.
    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new BadRequestException(
        `Transaction rejected in simulation: ${sim.error}`,
      );
    }
    tx.sign(kp);
    return this.sendAndWait(tx);
  }

  async sendAndWait(
    tx: Transaction,
    timeoutMs = 45_000,
  ): Promise<SubmitResult> {
    const sent = await this.server.sendTransaction(tx);
    if (sent.status === "ERROR") {
      const detail = sent.errorResult
        ? JSON.stringify(sent.errorResult.toJson())
        : "unknown";
      throw new BadRequestException(
        `Transaction rejected by the network: ${detail}`,
      );
    }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      const res = await this.server.getTransaction(sent.hash);
      if (res.status === "SUCCESS") {
        return {
          txHash: sent.hash,
          status: "SUCCESS",
          resultValue: res.returnValue,
        };
      }
      if (res.status === "FAILED") {
        return { txHash: sent.hash, status: "FAILED" };
      }
    }
    return { txHash: sent.hash, status: "PENDING" };
  }

  async status(txHash: string): Promise<{ txHash: string; status: string }> {
    const res = await this.server.getTransaction(txHash);
    const map: Record<string, string> = {
      SUCCESS: "success",
      FAILED: "failed",
      NOT_FOUND: "pending",
    };
    return {
      txHash,
      status: map[res.status] ?? String(res.status).toLowerCase(),
    };
  }

  /** Deploy a GuardianWallet through the factory for a passkey. */
  async deployWallet(
    saltHex: string,
    credentialIdBytes: Uint8Array,
    publicKey: Uint8Array,
  ) {
    if (!this.factoryContractId)
      throw new ServiceUnavailableException(
        "FACTORY_CONTRACT_ID is not configured",
      );
    if (publicKey.length !== 65 || publicKey[0] !== 0x04) {
      throw new BadRequestException(
        "publicKey must be an uncompressed P-256 key (65 bytes, 0x04 prefix)",
      );
    }
    const salt = Buffer.from(saltHex, "hex");
    if (salt.length !== 32)
      throw new BadRequestException("salt must be 32 bytes");
    await this.ensureFunded();
    const result = await this.invoke(this.factoryContractId, "deploy_wallet", [
      nativeToScVal(new Uint8Array(salt)),
      nativeToScVal(credentialIdBytes),
      nativeToScVal(publicKey),
    ]);
    if (result.status !== "SUCCESS" || !result.resultValue) {
      throw new BadRequestException(
        `Wallet deployment ${result.status.toLowerCase()} (tx ${result.txHash})`,
      );
    }
    const walletAddress = scValToNative(result.resultValue) as string;
    return { walletAddress, txHash: result.txHash };
  }

  /** Testnet faucet: sponsor → wallet. */
  async faucet(walletAddress: string) {
    if (!this.isTestnet)
      throw new BadRequestException("Faucet is only available on testnet");
    await this.ensureFunded();
    const amount = BigInt(this.faucetAmountXlm) * STROOPS;
    const result = await this.invoke(this.nativeTokenContractId, "transfer", [
      new Address(this.publicKey).toScVal(),
      new Address(walletAddress).toScVal(),
      nativeToScVal(amount, { type: "i128" }),
    ]);
    if (result.status !== "SUCCESS") {
      throw new BadRequestException(
        `Faucet transfer ${result.status.toLowerCase()} (tx ${result.txHash})`,
      );
    }
    return { txHash: result.txHash, amount: amount.toString() };
  }
}
