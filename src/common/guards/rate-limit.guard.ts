import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";

export const RateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  keyStrategy: "ip" | "wallet";
}) => SetMetadata("rate-limit-options", options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<{
      windowMs: number;
      maxRequests: number;
      keyStrategy: "ip" | "wallet";
    }>("rate-limit-options", context.getHandler());

    if (!options) return true; // No rate limiting applied

    const req = context.switchToHttp().getRequest();
    let key = "";

    if (options.keyStrategy === "ip") {
      key = `rate-limit:ip:${req.ip}`;
    } else if (options.keyStrategy === "wallet") {
      const walletAddress = req.body?.walletAddress || req.query?.walletAddress;
      if (!walletAddress) {
        throw new HttpException(
          "Wallet address required for rate limiting",
          HttpStatus.BAD_REQUEST,
        );
      }
      key = `rate-limit:wallet:${walletAddress}`;
    }

    const currentCount = await this.redisClient.incr(key);

    if (currentCount === 1) {
      await this.redisClient.pexpire(key, options.windowMs);
    }

    if (currentCount > options.maxRequests) {
      throw new HttpException(
        "Too Many Requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
