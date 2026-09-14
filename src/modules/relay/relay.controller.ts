import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UsePipes,
  UseGuards,
} from "@nestjs/common";
import { RelayService } from "./relay.service";
import {
  SubmitTransactionDtoSchema,
  SubmitTransactionDto,
  DeployWalletDtoSchema,
  DeployWalletDto,
  FaucetDtoSchema,
  FaucetDto,
} from "@common/schemas/relay.schema";
import { ZodValidationPipe } from "@common/pipes/zod-validation.pipe";
import { RateLimit, RateLimitGuard } from "@common/guards/rate-limit.guard";

@Controller("relay")
@UseGuards(RateLimitGuard)
export class RelayController {
  constructor(private readonly relayService: RelayService) {}

  /** Sponsor public key + network/contract ids the SDK needs. */
  @Get("info")
  @RateLimit({ windowMs: 10000, maxRequests: 60, keyStrategy: "ip" })
  info() {
    return this.relayService.info();
  }

  /** Deploy a GuardianWallet for a registered passkey (sponsor pays). */
  @Post("deploy")
  @RateLimit({ windowMs: 60000, maxRequests: 10, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(DeployWalletDtoSchema))
  async deployWallet(@Body() dto: DeployWalletDto) {
    return this.relayService.deployWallet(dto);
  }

  /** Submit a passkey-authorised transaction; the relay signs the envelope and pays. */
  @Post("submit")
  @RateLimit({ windowMs: 60000, maxRequests: 10, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(SubmitTransactionDtoSchema))
  async submitTransaction(@Body() dto: SubmitTransactionDto) {
    return this.relayService.submitTransaction(dto);
  }

  /** Testnet only: send XLM from the sponsor to a wallet. */
  @Post("faucet")
  @RateLimit({ windowMs: 60000, maxRequests: 10, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(FaucetDtoSchema))
  async faucet(@Body() dto: FaucetDto) {
    return this.relayService.faucet(dto);
  }

  @Get("status/:txHash")
  @RateLimit({ windowMs: 10000, maxRequests: 30, keyStrategy: "ip" })
  async getTransactionStatus(@Param("txHash") txHash: string) {
    return this.relayService.getTransactionStatus(txHash);
  }
}
