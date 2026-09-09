import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UsePipes,
  UseGuards,
} from "@nestjs/common";
import { SessionsService } from "./sessions.service";
import {
  CreateSessionDtoSchema,
  CreateSessionDto,
} from "@common/schemas/sessions.schema";
import { ZodValidationPipe } from "@common/pipes/zod-validation.pipe";
import { RateLimit, RateLimitGuard } from "@common/guards/rate-limit.guard";

@Controller("sessions")
@UseGuards(RateLimitGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @RateLimit({ windowMs: 60000, maxRequests: 10, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(CreateSessionDtoSchema))
  async createSession(@Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(dto);
  }

  @Delete(":id")
  @RateLimit({ windowMs: 60000, maxRequests: 20, keyStrategy: "ip" })
  async revokeSession(
    @Param("id") id: string,
    @Query("walletAddress") walletAddress: string,
  ) {
    return this.sessionsService.revokeSession(id, walletAddress);
  }

  @Get()
  @RateLimit({ windowMs: 60000, maxRequests: 50, keyStrategy: "ip" })
  async getActiveSessions(@Query("walletAddress") walletAddress: string) {
    if (!walletAddress) {
      throw new Error("walletAddress query parameter is required");
    }
    return this.sessionsService.getActiveSessions(walletAddress);
  }
}
