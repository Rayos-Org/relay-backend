import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("Rate Limiter (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/relay/status/:txHash (GET) - Should limit requests to 30 per 10s", async () => {
    const txHash = "dummy_hash";
    let response;

    // Simulate 30 requests (limit)
    for (let i = 0; i < 30; i++) {
      response = await request(app.getHttpServer()).get(
        `/relay/status/${txHash}`,
      ).set('X-Forwarded-For', '192.168.1.100');
      // Usually would be 200/400 depending on actual DB/RPC, but rate limit shouldn't be 429 yet.
      expect(response.status).not.toBe(429);
    }

    // The 31st request should be rate-limited
    response = await request(app.getHttpServer()).get(
      `/relay/status/${txHash}`,
    ).set('X-Forwarded-For', '192.168.1.100');
    expect(response.status).toBe(429);
  }, 15000);
});
