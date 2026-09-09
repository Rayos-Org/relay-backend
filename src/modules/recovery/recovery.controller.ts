import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UsePipes,
  UseGuards,
} from "@nestjs/common";
import { RecoveryService } from "./recovery.service";
import {
  ProposeRecoveryDtoSchema,
  ProposeRecoveryDto,
  ApproveRecoveryDtoSchema,
  ApproveRecoveryDto,
} from "@common/schemas/recovery.schema";
import { ZodValidationPipe } from "@common/pipes/zod-validation.pipe";
import { RateLimit, RateLimitGuard } from "@common/guards/rate-limit.guard";

@Controller("recovery")
@UseGuards(RateLimitGuard)
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Post("propose")
  @RateLimit({ windowMs: 60000, maxRequests: 5, keyStrategy: "wallet" })
  @UsePipes(new ZodValidationPipe(ProposeRecoveryDtoSchema))
  async proposeRecovery(@Body() dto: ProposeRecoveryDto) {
    return this.recoveryService.proposeRecovery(dto);
  }

  @Post("approve")
  @RateLimit({ windowMs: 60000, maxRequests: 10, keyStrategy: "wallet" })
  @UsePipes(new ZodValidationPipe(ApproveRecoveryDtoSchema))
  async approveRecovery(@Body() dto: ApproveRecoveryDto) {
    return this.recoveryService.approveRecovery(dto);
  }

  @Get(":proposalId/status")
  @RateLimit({ windowMs: 10000, maxRequests: 30, keyStrategy: "ip" })
  async getRecoveryStatus(@Param("proposalId") proposalId: string) {
    return this.recoveryService.getRecoveryStatus(proposalId);
  }
}
