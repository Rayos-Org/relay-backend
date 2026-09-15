import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import Redis from "ioredis";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { REDIS_CLIENT } from "@common/redis/redis.module";
import { DATABASE_CONNECTION } from "@common/database/database.module";
import * as schema from "../../drizzle/schema";
import {
  WebAuthnRegisterOptionsDto,
  WebAuthnVerifyRegistrationDto,
  WebAuthnAssertOptionsDto,
  WebAuthnVerifyAssertionDto,
} from "@common/schemas/webauthn.schema";

const CHALLENGE_TTL_SECONDS = 300;

/**
 * WebAuthn ceremonies for the wallet clients.
 *
 * Registration: `register/options` → browser/native passkey creation →
 * `register/verify` (stores the COSE public key so sign-in can be verified).
 *
 * Sign-in: `assert/options` → passkey assertion → `assert/verify`.
 *
 * Transaction signing does NOT go through here — the challenge for that is
 * the Soroban authorisation payload and the signature is verified by the
 * wallet contract on-chain.
 */
@Injectable()
export class WebAuthnService {
  private readonly rpIds: string[];
  private readonly expectedOrigins: string[];

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private configService: ConfigService,
  ) {
    this.rpIds = (this.configService.get<string>("WEBAUTHN_RP_ID") || "localhost")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    
    // Comma-separated so the same relay can serve local dev + the deployed web app.
    this.expectedOrigins = (
      this.configService.get<string>("WEBAUTHN_ORIGIN") || ""
    )
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  // --- Registration Flow ---

  async getRegistrationOptions(dto: WebAuthnRegisterOptionsDto) {
    const challengeKey = `webauthn:challenge:reg:${dto.userHandle}`;

    const options = await generateRegistrationOptions({
      rpName: "Guardian Wallet",
      rpID: dto.rpId || this.rpIds[0],
      userID: new Uint8Array(Buffer.from(dto.userHandle)),
      userName: dto.userName,
      attestationType: "none",
      authenticatorSelection: {
        // Platform authenticator = Windows Hello / Touch ID / Face ID / Android
        // biometrics. Without this, browsers may offer a roaming USB security key.
        authenticatorAttachment: "platform",
        residentKey: "required",
        userVerification: "required",
      },
      // ES256 only: the wallet contract verifies P-256 (secp256r1) signatures.
      supportedAlgorithmIDs: [-7],
    });

    await this.redisClient.set(
      challengeKey,
      options.challenge,
      "EX",
      CHALLENGE_TTL_SECONDS,
    );
    return options;
  }

  async verifyRegistration(dto: WebAuthnVerifyRegistrationDto) {
    const challengeKey = `webauthn:challenge:reg:${dto.userHandle}`;
    const expectedChallenge = await this.redisClient.get(challengeKey);
    if (!expectedChallenge)
      throw new BadRequestException("Challenge expired or not found");

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: dto.response,
        expectedChallenge,
        expectedOrigin: this.expectedOrigins,
        expectedRPID: this.rpIds,
        requireUserVerification: true,
      });
    } catch (error: any) {
      throw new BadRequestException(`Verification failed: ${error.message}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException("Registration not verified");
    }
    await this.redisClient.del(challengeKey);

    const { credentialID, credentialPublicKey, counter } =
      verification.registrationInfo;
    // @simplewebauthn/server v10 already returns the id as a base64url string.
    const credentialId =
      typeof credentialID === "string"
        ? credentialID
        : Buffer.from(credentialID).toString("base64url");
    const publicKey = Buffer.from(credentialPublicKey).toString("base64url");

    await this.db
      .insert(schema.passkeys)
      .values({
        credential_id: credentialId,
        public_key: publicKey,
        user_handle: dto.userHandle,
        counter: String(counter),
      })
      .onConflictDoUpdate({
        target: schema.passkeys.credential_id,
        set: { public_key: publicKey, user_handle: dto.userHandle },
      });

    return { verified: true, credentialId, publicKey };
  }

  // --- Assertion (sign-in) Flow ---

  async getAuthenticationOptions(dto: WebAuthnAssertOptionsDto) {
    const challengeKey = `webauthn:challenge:auth:${dto.userHandle}`;
    const options = await generateAuthenticationOptions({
      rpID: dto.rpId || this.rpIds[0],
      userVerification: "required",
    });
    await this.redisClient.set(
      challengeKey,
      options.challenge,
      "EX",
      CHALLENGE_TTL_SECONDS,
    );
    return options;
  }

  async verifyAuthentication(dto: WebAuthnVerifyAssertionDto) {
    const challengeKey = `webauthn:challenge:auth:${dto.userHandle}`;
    const expectedChallenge = await this.redisClient.get(challengeKey);
    if (!expectedChallenge)
      throw new BadRequestException("Challenge expired or not found");

    const credentialId: string | undefined = dto.response?.id;
    if (!credentialId)
      throw new BadRequestException("Assertion is missing the credential id");

    const [passkey] = await this.db
      .select()
      .from(schema.passkeys)
      .where(eq(schema.passkeys.credential_id, credentialId))
      .limit(1);
    if (!passkey)
      throw new NotFoundException(
        `Unknown passkey ${credentialId}. Create a wallet first.`,
      );

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: dto.response,
        expectedChallenge,
        expectedOrigin: this.expectedOrigins,
        expectedRPID: this.rpIds,
        requireUserVerification: true,
        authenticator: {
          credentialID: passkey.credential_id,
          credentialPublicKey: new Uint8Array(
            Buffer.from(passkey.public_key, "base64url"),
          ),
          counter: Number(passkey.counter),
        },
      });
    } catch (error: any) {
      throw new BadRequestException(`Verification failed: ${error.message}`);
    }

    if (!verification.verified)
      throw new BadRequestException("Authentication not verified");
    await this.redisClient.del(challengeKey);
    await this.db
      .update(schema.passkeys)
      .set({ counter: String(verification.authenticationInfo.newCounter) })
      .where(eq(schema.passkeys.credential_id, credentialId));

    return { verified: true, credentialId };
  }
}
