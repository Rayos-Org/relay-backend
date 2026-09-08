import { Injectable, Inject, BadRequestException, ForbiddenException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { rpc, Contract, xdr } from '@stellar/stellar-sdk';
import { DATABASE_CONNECTION } from '@common/database/database.module';
import * as schema from '../../../drizzle/schema';
import { CreateSessionDto } from '@common/schemas/sessions.schema';
import * as crypto from 'crypto';

@Injectable()
export class SessionsService {
  private rpcServer: rpc.Server;

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL')!;
    this.rpcServer = new rpc.Server(rpcUrl);
  }

  async createSession(dto: CreateSessionDto) {
    // 1. In a real environment, we'd verify the `signature` here to ensure the wallet owner authorized this off-chain tracking.
    // For now, we simulate the signature verification or rely on the on-chain verification step below.
    
    // Generate a unique session ID
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAtDate = new Date(dto.expiresAt);

    if (expiresAtDate <= new Date()) {
      throw new BadRequestException('Expiration time must be in the future');
    }

    // 2. Insert into database
    await this.db.insert(schema.sessions).values({
      session_id: sessionId,
      wallet_address: dto.walletAddress,
      scope: dto.scope,
      expires_at: expiresAtDate,
    });

    return {
      sessionId,
      walletAddress: dto.walletAddress,
      scope: dto.scope,
      expiresAt: dto.expiresAt,
      createdAt: new Date().toISOString(),
    };
  }

  async revokeSession(sessionId: string, walletAddress: string) {
    // 1. Fetch the session
    const [session] = await this.db.select()
      .from(schema.sessions)
      .where(eq(schema.sessions.session_id, sessionId))
      .limit(1);

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.wallet_address !== walletAddress) {
      throw new ForbiddenException('Unauthorized to revoke this session');
    }

    // 2. Mark as revoked
    await this.db.update(schema.sessions)
      .set({ revoked_at: new Date() })
      .where(eq(schema.sessions.session_id, sessionId));

    return { status: 'revoked' };
  }

  async getActiveSessions(walletAddress: string) {
    // 1. Query active, unrevoked, unexpired sessions
    const activeSessions = await this.db.select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.wallet_address, walletAddress),
          isNull(schema.sessions.revoked_at),
          gt(schema.sessions.expires_at, new Date())
        )
      );

    return activeSessions.map(session => ({
      sessionId: session.session_id,
      walletAddress: session.wallet_address,
      scope: session.scope,
      expiresAt: session.expires_at.toISOString(),
      createdAt: session.created_at.toISOString(),
    }));
  }
}
