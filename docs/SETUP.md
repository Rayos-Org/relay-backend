# Setup Guide

This guide covers how to set up the Rayos Relay Backend for local development.

## Prerequisites
- **Node.js**: v20 or later
- **pnpm**: v9.x
- **Docker & Docker Compose**: For local Postgres and Redis
- **Soroban CLI** (optional, for contract interaction)

## 1. Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Update the values in `.env` if necessary. The default values are designed to work with the local Docker setup.

**Note on Redis:** If you are using Upstash Redis, format the URL as `rediss://...` for `REDIS_URL` to ensure BullMQ can connect.

## 2. Start Infrastructure

Start the local Postgres database and Redis instance using Docker:
```bash
docker-compose up -d
```

## 3. Install Dependencies

```bash
pnpm install
```

## 4. Database Setup

We use Drizzle ORM. Push the schema to the database:
```bash
pnpm db:push
```

To visually inspect the database tables:
```bash
pnpm db:studio
```

## 5. Run the Application

```bash
# Development mode
pnpm start:dev

# Production build
pnpm build
pnpm start:prod
```

The API will be available at `http://localhost:3000/api`.
Swagger documentation will be available at `http://localhost:3000/api/docs`.

## 6. Running Tests

```bash
pnpm run test:e2e
```
