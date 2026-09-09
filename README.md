<div align="center">

<img src="https://img.shields.io/badge/Rayos-Relay%20Backend-6366f1?style=for-the-badge&logoColor=white" alt="Rayos Relay" />

<br/>
<br/>

<p>
  <strong>The gasless transaction relay, session key orchestrator, and social recovery engine for the Rayos smart wallet on Stellar/Soroban.</strong>
</p>

<br/>

<!-- CI Status -->
<a href="https://github.com/Rayos-Org/relay-backend/actions/workflows/ci.yml">
  <img src="https://github.com/Rayos-Org/relay-backend/actions/workflows/ci.yml/badge.svg" alt="CI" />
</a>
<!-- Live Status -->
<a href="https://rayos-relay-backend.onrender.com/api/docs">
  <img src="https://img.shields.io/website?url=https%3A%2F%2Frayos-relay-backend.onrender.com%2Fapi%2Fdocs&label=API%20Status&up_message=live&down_message=offline&style=flat-square" alt="API Status" />
</a>
<!-- License -->
<a href="./LICENSE">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License: MIT" />
</a>
<!-- Node -->
<a href="https://nodejs.org/">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
</a>

<br/>
<br/>

<!-- Tech Stack Badges -->
<img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
<img src="https://img.shields.io/badge/Neon-00E5BF?style=flat-square&logo=neon&logoColor=black" alt="Neon DB"/>
<img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis"/>
<img src="https://img.shields.io/badge/BullMQ-FF4444?style=flat-square&logo=bull&logoColor=white" alt="BullMQ"/>
<img src="https://img.shields.io/badge/Stellar-7D00FF?style=flat-square&logo=stellar&logoColor=white" alt="Stellar"/>
<img src="https://img.shields.io/badge/Soroban-5A00FF?style=flat-square&logoColor=white" alt="Soroban"/>
<img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white" alt="Zod"/>
<img src="https://img.shields.io/badge/Drizzle-C5F74F?style=flat-square&logoColor=black" alt="Drizzle ORM"/>
<img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm"/>
<img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
<img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white" alt="Render"/>

</div>

---

## 📌 Table of Contents

- [What Is This?](#-what-is-this)
- [Features](#-features)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 What Is This?

The **Rayos Relay Backend** is a NestJS-based infrastructure layer for the Rayos smart wallet ecosystem on the **Stellar/Soroban** blockchain network.

It sits between the client application and the Soroban network, abstracting away all blockchain complexity. Users interact with a standard REST API — the relay handles gas sponsorship, passkey ceremony coordination, session tracking, and multi-guardian recovery orchestration completely in the background.

> **Trustless by Design:** The relay never holds private keys, never stores seed phrases, and cannot alter transaction payloads without invalidating the user's cryptographic signature. Read the full [Trust Model →](./docs/TRUST.md)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔑 **Passkey (WebAuthn) Orchestration** | Registers and verifies passkey ceremonies (Face ID, Touch ID, YubiKey) via WebAuthn/FIDO2, caching challenges in Redis with a strict TTL |
| ⛽ **Gasless Transactions** | Wraps user-signed XDR in a fee-bump transaction via Launchtube, making all wallet interactions gas-free for the end user |
| 🔒 **Session Key Management** | Creates and revokes temporary session scopes for seamless dapp logins, with fast off-chain lookups backed by Postgres |
| 🛡 **Social Recovery** | BullMQ-powered orchestration that notifies guardians via email (Resend), aggregates approvals, enforces timelocks, and executes on-chain recovery atomically |
| 📡 **Soroban Event Indexer** | Autonomous polling loop that syncs `credential_lookup` states from the Soroban RPC to the local database every 5 seconds |
| 🚦 **Rate Limiting** | Redis-backed per-IP and per-wallet rate limiting on all endpoints to protect against abuse and DDoS |
| 📄 **Swagger UI** | Auto-generated interactive API documentation available at `/api/docs` |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Wallet / Dapp)                │
│           (WebAuthn · XDR payload · Session req)         │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS REST API
┌─────────────────────▼───────────────────────────────────┐
│                  Rayos Relay Backend                      │
│                                                           │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐             │
│  │  WebAuthn  │  │  Relay   │  │ Sessions │             │
│  │  Module    │  │  Module  │  │  Module  │             │
│  └─────┬──────┘  └────┬─────┘  └────┬─────┘             │
│        │              │              │                    │
│  ┌─────▼──────────────▼──────────────▼──────────────┐   │
│  │               Recovery Module                     │   │
│  │          (BullMQ · Timelock · Resend Email)       │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │           Soroban Event Indexer (Polling)         │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│       Redis (Challenges · Rate Limits · BullMQ)          │
│       PostgreSQL / Neon (Sessions · Proposals · DB)      │
└──────────────────────────────┬──────────────────────────┘
                               │
              ┌────────────────▼────────────────┐
              │      Launchtube Fee Sponsor      │
              └────────────────┬────────────────┘
                               │ Fee-bump XDR
              ┌────────────────▼────────────────┐
              │         Stellar Network          │
              │     (Testnet / Mainnet)          │
              └─────────────────────────────────┘
```

---

## 📡 API Reference

**Live Interactive Docs (Swagger UI):**
👉 [`https://rayos-relay-backend.onrender.com/api/docs`](https://rayos-relay-backend.onrender.com/api/docs)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webauthn/register/options` | Generate WebAuthn registration options |
| `POST` | `/api/webauthn/register/verify` | Verify passkey registration |
| `POST` | `/api/webauthn/assert/options` | Generate authentication challenge |
| `POST` | `/api/webauthn/assert/verify` | Verify passkey authentication |
| `POST` | `/api/relay/submit` | Submit a signed XDR for gasless fee-bump |
| `GET`  | `/api/relay/status/:txHash` | Poll transaction status on Soroban RPC |
| `POST` | `/api/sessions` | Create a session key |
| `DELETE`| `/api/sessions/:sessionId` | Revoke a session |
| `GET`  | `/api/sessions` | List active sessions for a wallet |
| `POST` | `/api/recovery/propose` | Propose a social recovery |
| `POST` | `/api/recovery/approve` | Guardian approves a recovery proposal |
| `GET`  | `/api/recovery/:proposalId/status` | Get proposal status |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [NestJS](https://nestjs.com/) v10 (Node.js / TypeScript) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Neon Serverless](https://neon.tech/) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **Cache / Queue** | [Redis](https://redis.io/) + [BullMQ](https://docs.bullmq.io/) via [Upstash](https://upstash.com/) |
| **Validation** | [Zod](https://zod.dev/) with custom `ZodValidationPipe` |
| **Authentication** | [SimpleWebAuthn](https://simplewebauthn.dev/) (WebAuthn / FIDO2) |
| **Blockchain** | [@stellar/stellar-sdk](https://github.com/stellar/js-stellar-sdk) + [@rayos/wallet-sdk](https://www.npmjs.com/package/@rayos/wallet-sdk) |
| **Email** | [Resend](https://resend.com/) |
| **API Docs** | [Swagger / OpenAPI](https://swagger.io/) via `@nestjs/swagger` |
| **Deployment** | [Render](https://render.com/) |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) |
| **Package Manager** | [pnpm](https://pnpm.io/) v9 |

---

## ⚡ Quick Start

### Prerequisites
- Node.js v20+
- pnpm v9 (`npm install -g pnpm@9`)
- Docker & Docker Compose

### 1. Clone the Repository
```bash
git clone https://github.com/Rayos-Org/relay-backend.git
cd relay-backend
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Start Infrastructure (Postgres + Redis)
```bash
docker-compose up -d
```

### 5. Push Database Schema
```bash
pnpm db:push
```

### 6. Run the Backend
```bash
pnpm start:dev
```

The API is available at **`http://localhost:3000/api`**
Swagger UI is available at **`http://localhost:3000/api/docs`**

For the full local setup guide, see **[docs/SETUP.md →](./docs/SETUP.md)**

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon Postgres connection URL |
| `REDIS_URL` | ✅ | Upstash Redis URL (`rediss://...`) |
| `SOROBAN_RPC_URL` | ✅ | Soroban RPC endpoint |
| `WEBAUTHN_RP_ID` | ✅ | WebAuthn Relying Party ID (your domain) |
| `WEBAUTHN_ORIGIN` | ✅ | Full origin URL of the client app |
| `RESEND_API_KEY` | ⚠️ Optional | Resend API key for guardian email alerts |
| `LAUNCHTUBE_API_KEY` | ⚠️ Optional | Launchtube key for fee-bump sponsorship |
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ✅ | HTTP port (default: `3000`) |

> **Note:** If `RESEND_API_KEY` is not set, the backend gracefully falls back to logging email content to the console. If `LAUNCHTUBE_API_KEY` is not set, the `/api/relay/submit` endpoint will return an error, but all other endpoints remain fully functional.

---

## 🚀 Deployment

The backend is deployed on **Render** and is publicly accessible:

🌐 **Live API:** [`https://rayos-relay-backend.onrender.com/api`](https://rayos-relay-backend.onrender.com/api)
📄 **Swagger Docs:** [`https://rayos-relay-backend.onrender.com/api/docs`](https://rayos-relay-backend.onrender.com/api/docs)

### Deploy Your Own

This repo contains a `render.yaml` Blueprint. To deploy your own instance:
1. Fork this repository.
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Blueprint**.
3. Connect the forked repo. Render auto-reads `render.yaml`.
4. Fill in the required environment variables.
5. Click **Apply**.

> 💡 A GitHub Actions workflow (`.github/workflows/keepalive.yml`) automatically pings the service every 10 minutes to prevent the free-tier service from sleeping.

---

## 📚 Documentation

| Document | Description |
|---|---|
| [docs/SETUP.md](./docs/SETUP.md) | Full local development setup guide |
| [docs/TRUST.md](./docs/TRUST.md) | Trust model — why the relay cannot steal funds |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | How to contribute to this project |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security policy and vulnerability reporting |

---

## 🤝 Contributing

Contributions are what make open source great. Any contributions are **greatly appreciated**.

1. Fork the project
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

Please read [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.

---

<div align="center">
  <sub>Built with ❤️ by the <a href="https://github.com/Rayos-Org">Rayos Team</a></sub>
</div>
