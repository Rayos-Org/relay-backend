import { Module } from '@nestjs/common';
import { RelayService } from './relay.service';
import { RelayController } from './relay.controller';
import { LaunchtubeStrategy } from './strategies/launchtube.strategy';

@Module({
  controllers: [RelayController],
  providers: [RelayService, LaunchtubeStrategy],
  exports: [RelayService],
})
export class RelayModule {}
