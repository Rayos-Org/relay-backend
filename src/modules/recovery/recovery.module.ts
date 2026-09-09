import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { RecoveryService } from "./recovery.service";
import { RecoveryController } from "./recovery.controller";
import { RecoveryProcessor } from "./recovery.processor";
import { ResendNotificationProvider } from "./notifications/resend.notification";
import { RelayModule } from "../relay/relay.module";
import { WebAuthnModule } from "../webauthn/webauthn.module";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>("REDIS_URL");
        if (redisUrl) {
          return { connection: { url: redisUrl } };
        }
        return {
          connection: {
            host: configService.get<string>("REDIS_HOST", "localhost"),
            port: configService.get<number>("REDIS_PORT", 6379),
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: "recovery",
    }),
    RelayModule,
    WebAuthnModule,
  ],
  controllers: [RecoveryController],
  providers: [RecoveryService, RecoveryProcessor, ResendNotificationProvider],
  exports: [RecoveryService],
})
export class RecoveryModule {}
