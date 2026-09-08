import { Module } from '@nestjs/common';
import { ConfigModule } from '@config/config.module';
import { DatabaseModule } from '@common/database/database.module';
import { RedisModule } from '@common/redis/redis.module';
import { WebAuthnModule } from '@modules/webauthn/webauthn.module';
import { RelayModule } from '@modules/relay/relay.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { IndexerModule } from '@modules/indexer/indexer.module';

@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule, WebAuthnModule, RelayModule, SessionsModule, IndexerModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
