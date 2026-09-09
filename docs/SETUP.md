# Local Development Setup

This guide gets the Rayos Relay Backend running on your machine in under 5 minutes.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | v20+ | [nodejs.org](https://nodejs.org/) |
| pnpm | v9.x | `npm install -g pnpm@9` |
| Docker | Latest | [docker.com](https://www.docker.com/get-started) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

---

## Step 1 — Clone & Install

```bash
git clone https://github.com/Rayos-Org/relay-backend.git
cd relay-backend
pnpm install
```

---

## Step 2 — Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values. For **local development**, the defaults will work with the Docker setup below.

> For a full description of every variable, see the [Environment Variables table in the README](../README.md#-environment-variables).

---

## Step 3 — Start Infrastructure (Docker)

The project ships with a `docker-compose.yml` for local Postgres and Redis.

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`

---

## Step 4 — Push Database Schema

We use Drizzle ORM for database management. Push the schema to your local (or Neon) Postgres instance:

```bash
pnpm db:push
```

To visually inspect the database tables in a web UI:

```bash
pnpm db:studio
# Opens http://localhost:4983
```

---

## Step 5 — Run the Application

```bash
# Development mode with hot-reload
pnpm start:dev

# Or production build
pnpm build && pnpm start:prod
```

| URL | Description |
|---|---|
| `http://localhost:3000/api` | REST API root |
| `http://localhost:3000/api/docs` | Interactive Swagger / OpenAPI UI |

---

## Running Tests

```bash
# E2E test suite
pnpm run test:e2e

# Zod schema validation tests
pnpm exec jest test/zod-schemas.e2e-spec.ts --config ./test/jest-e2e.json
```

---

## Useful Scripts

| Command | Description |
|---|---|
| `pnpm start:dev` | Start in watch mode (development) |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm lint` | ESLint with auto-fix |
| `pnpm format` | Prettier formatting |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:generate` | Generate new migration files |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |
| `pnpm run test:e2e` | Run E2E test suite |

---

## Troubleshooting

**`Cannot connect to Redis`**: Make sure Docker is running (`docker ps`) and Redis is healthy on port `6379`.

**`DATABASE_URL connection refused`**: Make sure the Postgres container is running or that your `DATABASE_URL` points to a valid Neon instance.

**`pnpm: command not found`**: Run `npm install -g pnpm@9` first.
