# `relay-backend` — Architecture

## 1. Purpose & Scope

The off-chain support service: sponsors transaction fees so users never need XLM, issues
and tracks session keys, coordinates guardian recovery notifications, and indexes
credential-ID → wallet-address mappings so apps can look up "whose wallet is this passkey"
without scanning the ledger.

This service should hold **no unilateral custody or authority** — every sensitive action
it performs (spending, recovery) is still gated by the on-chain policy contract. If this
backend disappears, users should still be able to recover funds via an alternate relay or
direct RPC access (document this fallback explicitly — it's a key trust claim).

## 2. Tech Stack

- TypeScript + NestJS (or Rust + `axum` — pick one; NestJS shown below for concreteness)
- **PostgreSQL via Neon** (serverless Postgres, generous free tier, works well with
  branch-per-PR preview databases — see the org deployment guide) accessed via
  `@neondatabase/serverless` + Drizzle ORM (Drizzle is MIT-licensed and pairs naturally
  with Neon's driver; Prisma is a fine alternative if the team prefers it)
- Redis (rate limiting, WebAuthn challenge caching, nonce management) — Upstash's
  serverless Redis has an open-source-friendly free tier and pairs well with a
  Vercel-adjacent deployment
- **Open-source Web3 tooling only:**
  - `soroban-rpc` / Horizon (SDF's own open-source node software) as the network access
    layer — self-hosted or via a public open RPC endpoint, never a closed proprietary API
  - `Launchtube` (MIT-licensed, kalepail) for fee sponsorship — open source, self-hostable
  - A **self-hosted custom indexer** (see `modules/indexer`) built directly against
    Soroban RPC event streams, rather than a closed, hosted indexing SaaS — this keeps
    the entire data pipeline auditable and rebuildable by anyone forking the project,
    which matters both for genuine decentralization and for OSS-program credibility
- `zod` (shared with `wallet-sdk`) for request/response schema validation
- BullMQ (Redis-backed, MIT-licensed) for async jobs (recovery timelocks, notification sends)

## 3. Directory Structure

```
relay-backend/
├── src/
│   ├── modules/
│   │   ├── relay/
│   │   │   ├── relay.controller.ts     # POST /relay/submit
│   │   │   ├── relay.service.ts        # wraps Launchtube or custom sponsorship logic
│   │   │   └── relay.dto.ts
│   │   ├── sessions/
│   │   │   ├── sessions.controller.ts  # POST /sessions, DELETE /sessions/:id
│   │   │   ├── sessions.service.ts
│   │   │   └── sessions.entity.ts
│   │   ├── recovery/
│   │   │   ├── recovery.controller.ts  # POST /recovery/propose, /approve
│   │   │   ├── recovery.service.ts     # timelock + guardian notification orchestration
│   │   │   └── recovery.entity.ts
│   │   ├── indexer/
│   │   │   ├── indexer.service.ts      # subscribes to contract events, builds lookup table
│   │   │   └── credential-lookup.entity.ts
│   │   └── webauthn/
│   │       ├── webauthn.controller.ts  # challenge issuance for registration/assertion
│   │       └── webauthn.service.ts     # wraps @simplewebauthn/server
│   ├── common/
│   │   ├── guards/                     # rate limiting, API key checks for demo-app etc.
│   │   ├── filters/                    # error → typed HTTP response mapping
│   │   └── schemas/                    # zod schemas shared with wallet-sdk (published)
│   ├── config/
│   └── main.ts
├── drizzle/
│   ├── schema.ts                 # table definitions (see Data Model below)
│   └── migrations/
├── test/
│   ├── relay.e2e-spec.ts
│   ├── recovery.e2e-spec.ts
│   └── indexer.e2e-spec.ts
├── docker-compose.yml            # local Postgres (Neon-compatible) + Redis for dev/CI
├── package.json
└── ARCHITECTURE.md
```

> Local development still runs plain Postgres in Docker for speed and offline work; Neon
> is used for every hosted environment (`testnet-dev`, `testnet-staging`, `mainnet`), one
> branch per environment plus an ephemeral branch per PR for E2E isolation.

## 4. Data Model (core tables)

| Table | Key fields | Notes |
|---|---|---|
| `credential_lookup` | `credential_id`, `wallet_address` | Populated by the indexer from on-chain events, not writable by API clients directly |
| `sessions` | `session_id`, `wallet_address`, `scope`, `expires_at`, `revoked_at` | Mirrors on-chain session-key state for fast reads; on-chain remains source of truth |
| `recovery_proposals` | `proposal_id`, `wallet_address`, `new_signer`, `approvals[]`, `timelock_expires_at`, `status` | Drives guardian notification + timelock enforcement |
| `webauthn_challenges` | `challenge`, `user_handle`, `expires_at` | Short-lived, Redis-backed in practice rather than Postgres |

## 5. API Surface (high level)

| Endpoint | Purpose |
|---|---|
| `POST /webauthn/register/options` / `.../verify` | WebAuthn registration ceremony |
| `POST /webauthn/assert/options` / `.../verify` | WebAuthn login/signing ceremony |
| `POST /relay/submit` | Accepts a signed XDR, sponsors fee, submits to network |
| `POST /sessions` / `DELETE /sessions/:id` | Session-key lifecycle (mirrors on-chain calls, adds notification/UX layer) |
| `POST /recovery/propose` / `POST /recovery/approve` | Guardian recovery orchestration |
| `GET /wallets/:credentialId` | Resolve a passkey credential to its wallet address |

Full request/response schemas live in `src/common/schemas` and are published as a small
package consumed by both this repo's tests and `wallet-sdk`'s relay client, so the two
never drift silently.

## 6. Key Flows

**Fee-sponsored submission**
1. Client (`wallet-sdk`) posts signed XDR to `POST /relay/submit`.
2. Service validates the transaction shape and rate limits (per-wallet, per-IP).
3. Service either forwards to Launchtube or wraps/fee-bumps itself, then submits to RPC.
4. Response includes the resulting transaction hash; client polls or subscribes for status.

**Guardian recovery**
1. `POST /recovery/propose` creates a `recovery_proposals` row and enqueues guardian
   notification jobs (email/push — implementation detail, keep pluggable).
2. Each guardian's `POST /recovery/approve` call is itself a passkey-signed action,
   verified via the guardian's own WebAuthn ceremony, then recorded.
3. Once the on-chain N-of-M threshold and timelock are satisfied, a background job submits
   the final `approve_recovery` contract call.
4. Status is exposed via a polling endpoint so the frontend can show progress.

## 7. Testing Strategy

- Unit tests per service with mocked contract/RPC clients
- E2E tests spinning up local Postgres+Redis via `docker-compose` and a local Soroban
  testnet, exercising full flows (register → submit → session create → recovery)
- Load test the `/relay/submit` path specifically — this is the highest-traffic, most
  latency-sensitive endpoint
- Explicit tests for rate-limit and abuse scenarios (repeated failed WebAuthn attempts,
  recovery-proposal spam)

## 8. CI/CD & Deployment

- Standard lint/typecheck/test on PR
- E2E suite runs against ephemeral Docker services in CI
- Deploy via `infra`'s pipeline to a staging environment on every `main` merge, promoted to
  production on tagged release
- Secrets (Launchtube API keys, DB credentials, WebAuthn RP ID/origin config) managed via
  the secrets manager defined in `infra`, never committed

## 9. Trust & Fallback Notes

Document clearly in this repo's README (not just here) that:
- This service cannot move user funds without a valid on-chain-verified signature —
  it only relays and coordinates.
- If this service is unavailable, advanced users can submit transactions directly via RPC
  using `wallet-sdk` in a non-sponsored mode (document that escape hatch explicitly).

## 10. Dependencies on Other Repos

- Consumes `wallet-contracts` event schemas and error codes for the indexer
- Publishes the shared API schema package consumed by `wallet-sdk`
- Deployed and monitored via configuration owned in `infra`
