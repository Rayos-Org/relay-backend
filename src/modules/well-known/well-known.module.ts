import { Module } from '@nestjs/common';
import { WellKnownController } from './well-known.controller';
import { ConfigModule } from '@config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [WellKnownController],
})
export class WellKnownModule {}
