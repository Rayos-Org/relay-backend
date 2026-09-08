import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@common/redis/redis.module';
import {
  WebAuthnRegisterOptionsDto,
  WebAuthnVerifyRegistrationDto,
  WebAuthnAssertOptionsDto,
  WebAuthnVerifyAssertionDto,
} from '@common/schemas/webauthn.schema';

@Injectable()
export class WebAuthnService {
  private readonly rpId: string;
  private readonly expectedOrigin: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private configService: ConfigService,
  ) {
    this.rpId = this.configService.get<string>('WEBAUTHN_RP_ID')!;
    this.expectedOrigin = this.configService.get<string>('WEBAUTHN_ORIGIN')!;
  }

  // --- Registration Flow ---

  async getRegistrationOptions(dto: WebAuthnRegisterOptionsDto) {
    const challengeKey = `webauthn:challenge:reg:${dto.userHandle}`;

    const options = await generateRegistrationOptions({
      rpName: 'Rayos Relay',
      rpID: this.rpId,
      userID: new Uint8Array(Buffer.from(dto.userHandle)),
      userName: dto.userName,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    });

    // Store challenge for 5 minutes
    await this.redisClient.set(challengeKey, options.challenge, 'EX', 300);

    return options;
  }

  async verifyRegistration(dto: WebAuthnVerifyRegistrationDto) {
    const challengeKey = `webauthn:challenge:reg:${dto.userHandle}`;
    const expectedChallenge = await this.redisClient.get(challengeKey);

    if (!expectedChallenge) {
      throw new BadRequestException('Challenge expired or not found');
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: dto.response,
        expectedChallenge,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpId,
      });
    } catch (error: any) {
      throw new BadRequestException(`Verification failed: ${error.message}`);
    }

    if (verification.verified && verification.registrationInfo) {
      // Consume challenge to prevent replay
      await this.redisClient.del(challengeKey);

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      // In the real flow, wallet-sdk creates the transaction on-chain containing this key.
      // This endpoint confirms the user successfully completed a ceremony before submitting.
      return {
        verified: true,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      };
    }

    throw new BadRequestException('Registration not verified');
  }

  // --- Assertion Flow ---

  async getAuthenticationOptions(dto: WebAuthnAssertOptionsDto) {
    const challengeKey = `webauthn:challenge:auth:${dto.userHandle}`;

    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'preferred',
    });

    // Store challenge for 5 minutes
    await this.redisClient.set(challengeKey, options.challenge, 'EX', 300);

    return options;
  }

  async verifyAuthentication(dto: WebAuthnVerifyAssertionDto, storedPublicKeyBase64url: string) {
    const challengeKey = `webauthn:challenge:auth:${dto.userHandle}`;
    const expectedChallenge = await this.redisClient.get(challengeKey);

    if (!expectedChallenge) {
      throw new BadRequestException('Challenge expired or not found');
    }

    const authenticator = {
      credentialPublicKey: Buffer.from(storedPublicKeyBase64url, 'base64url'),
      credentialID: dto.response.id,
      counter: 0, // We aren't strictly verifying counters off-chain as Soroban contract manages nonces
    } as any;

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: dto.response,
        expectedChallenge,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpId,
        authenticator,
      });
    } catch (error: any) {
      throw new BadRequestException(`Verification failed: ${error.message}`);
    }

    if (verification.verified) {
      // Consume challenge
      await this.redisClient.del(challengeKey);
      return { verified: true };
    }

    throw new BadRequestException('Authentication not verified');
  }
}
