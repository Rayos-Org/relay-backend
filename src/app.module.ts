import { Module } from '@nestjs/common';
import { ConfigModule } from '@config/config.module';
import { DatabaseModule } from '@common/database/database.module';
import { RedisModule } from '@common/redis/redis.module';
import { WebAuthnModule } from '@modules/webauthn/webauthn.module';
import { RelayModule } from '@modules/relay/relay.module';

@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule, WebAuthnModule, RelayModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
