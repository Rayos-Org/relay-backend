import { Module } from "@nestjs/common";
import { RelayService } from "./relay.service";
import { RelayController } from "./relay.controller";
import { SponsorService } from "./sponsor.service";
import { LaunchtubeStrategy } from "./strategies/launchtube.strategy";
import { IndexerModule } from "../indexer/indexer.module";

@Module({
  imports: [IndexerModule],
  controllers: [RelayController],
  providers: [RelayService, SponsorService, LaunchtubeStrategy],
  exports: [RelayService, SponsorService],
})
export class RelayModule {}
