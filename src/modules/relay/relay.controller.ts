import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UsePipes,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { RelayService } from "./relay.service";
import {
  SubmitTransactionDtoSchema,
  SubmitTransactionDto,
} from "@common/schemas/relay.schema";
import { ZodValidationPipe } from "@common/pipes/zod-validation.pipe";
import { RateLimit, RateLimitGuard } from "@common/guards/rate-limit.guard";

@Controller("relay")
@UseGuards(RateLimitGuard)
export class RelayController {
  constructor(private readonly relayService: RelayService) {}

  @Post("submit")
  // 10 req/min per IP
  @RateLimit({ windowMs: 60000, maxRequests: 10, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(SubmitTransactionDtoSchema))
  async submitTransaction(@Body() dto: SubmitTransactionDto) {
    return this.relayService.submitTransaction(dto);
  }

  @Get("status/:txHash")
  @RateLimit({ windowMs: 10000, maxRequests: 30, keyStrategy: "ip" })
  async getTransactionStatus(@Param("txHash") txHash: string) {
    return this.relayService.getTransactionStatus(txHash);
  }
}
