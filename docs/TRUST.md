# Trust Model

> The Rayos Relay Backend is trustless by design. This document explains exactly what data the relay holds, what it never touches, and why it is mathematically impossible for it to steal funds.

---

## 1. No Private Keys — Ever

**The relay NEVER sees, handles, stores, or transmits user private keys.**

- Passkeys (WebAuthn credentials) are generated and stored exclusively in the user's **secure hardware enclave** — Apple Keychain (Face ID / Touch ID), Android Keystore, or a hardware key like a YubiKey.
- The relay stores only the **public part** of the passkey: the `credential_id` and the `wallet_address` it maps to. From a cryptographic standpoint, this is identical to publishing a public key — it cannot be used to sign anything.
- Challenge generation (for registration and authentication) is handled by the relay, but challenges are **one-time-use, TTL-bound, and stored in Redis** — they expire in 5 minutes and cannot be reused.

## 2. Gasless Transactions Cannot Be Tampered With

When a user submits a transaction:
1. The user signs the **Soroban XDR** on their device locally using their passkey.
2. The signed XDR is sent to the relay.
3. The relay wraps it in a **fee-bump transaction** (adds its own sponsoring key for the gas fee only) and submits it to the network.

**The relay cannot change the inner transaction payload.** Doing so would invalidate the user's cryptographic signature, and the Soroban network would reject it outright. The relay can only pay for gas — it cannot move funds or execute arbitrary logic on behalf of the user.

## 3. Social Recovery Is Guardian-Gated

The relay acts as an **orchestrator and notification service** for social recovery — not an authority.

- It notifies guardians when a recovery proposal is created.
- It aggregates guardian approvals.
- It enforces both a **guardian threshold** (e.g. 2-of-3 guardians must approve) and a **timelock period** (24 hours must pass) before executing.
- The **final execution is a Soroban transaction** that the smart contract itself validates. The contract checks that sufficient guardian signatures are present on-chain, independent of the relay.

This means even if the relay were compromised, an attacker would also need to compromise enough guardian wallets to reach the approval threshold — and wait out the timelock period.

## 4. What Data Is Stored

| Data | Stored | Why |
|---|---|---|
| Passkey `credential_id` (public) | ✅ Yes | Route login requests to the correct wallet |
| Wallet `address` | ✅ Yes | Link credentials to on-chain identity |
| Session scopes & expiry | ✅ Yes | Fast off-chain session management for dapps |
| Recovery proposals & approvals | ✅ Yes | Orchestrate the multi-step recovery flow |
| WebAuthn challenges | ✅ Redis (TTL 5m) | Temporary, auto-expire, single-use |
| Private keys or seed phrases | ❌ Never | Not applicable — hardware only |
| Transaction signing keys | ❌ Never | Signing happens on the user's device |
