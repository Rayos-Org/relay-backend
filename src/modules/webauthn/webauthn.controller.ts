import {
  Controller,
  Post,
  Body,
  UsePipes,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { WebAuthnService } from "./webauthn.service";
import {
  WebAuthnRegisterOptionsDtoSchema,
  WebAuthnRegisterOptionsDto,
  WebAuthnVerifyRegistrationDtoSchema,
  WebAuthnVerifyRegistrationDto,
  WebAuthnAssertOptionsDtoSchema,
  WebAuthnAssertOptionsDto,
  WebAuthnVerifyAssertionDtoSchema,
  WebAuthnVerifyAssertionDto,
} from "@common/schemas/webauthn.schema";
import { ZodValidationPipe } from "@common/pipes/zod-validation.pipe";
import { RateLimit, RateLimitGuard } from "@common/guards/rate-limit.guard";

@Controller("webauthn")
@UseGuards(RateLimitGuard)
export class WebAuthnController {
  constructor(private readonly webauthnService: WebAuthnService) {}

  @Post("register/options")
  @RateLimit({ windowMs: 60000, maxRequests: 5, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(WebAuthnRegisterOptionsDtoSchema))
  async getRegistrationOptions(@Body() dto: WebAuthnRegisterOptionsDto) {
    return this.webauthnService.getRegistrationOptions(dto);
  }

  @Post("register/verify")
  @RateLimit({ windowMs: 60000, maxRequests: 5, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(WebAuthnVerifyRegistrationDtoSchema))
  async verifyRegistration(@Body() dto: WebAuthnVerifyRegistrationDto) {
    return this.webauthnService.verifyRegistration(dto);
  }

  @Post("assert/options")
  @RateLimit({ windowMs: 60000, maxRequests: 5, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(WebAuthnAssertOptionsDtoSchema))
  async getAuthenticationOptions(@Body() dto: WebAuthnAssertOptionsDto) {
    return this.webauthnService.getAuthenticationOptions(dto);
  }

  @Post("assert/verify")
  @RateLimit({ windowMs: 60000, maxRequests: 5, keyStrategy: "ip" })
  @UsePipes(new ZodValidationPipe(WebAuthnVerifyAssertionDtoSchema))
  async verifyAuthentication(@Body() dto: WebAuthnVerifyAssertionDto) {
    // In actual implementation, we'll fetch the stored public key for this credential from the indexer or sessions module.
    // Since verifyAuthentication logic depends on it, it might be moved to sessions/recovery service or we pass it here.
    // For now, this is a placeholder response assuming we validate the key elsewhere.
    return { status: "pending_key_verification" };
  }
}
