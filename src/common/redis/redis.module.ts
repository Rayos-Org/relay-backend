import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        let redisUrl = configService.get<string>("REDIS_URL");
        if (redisUrl) {
          // Upstash's TCP endpoint is TLS-only; a plain redis:// URL fails with
          // "max retries per request" — silently upgrade it.
          if (redisUrl.startsWith("redis://") && /upstash\.io/.test(redisUrl)) {
            redisUrl = redisUrl.replace(/^redis:\/\//, "rediss://");
          }
          return new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            connectTimeout: 10_000,
          });
        }

        const host = configService.get<string>("REDIS_HOST", "localhost");
        const port = configService.get<number>("REDIS_PORT", 6379);
        return new Redis({ host, port });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
