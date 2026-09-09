# Trust Model & Transparency

Rayos Relay is designed with a **zero-trust** architecture regarding user funds and private keys. 

## 1. No Private Keys
**The relay NEVER sees, handles, or stores user private keys.**
- Passkeys (WebAuthn) are stored on the user's secure enclave (e.g., Apple Keychain, Android Keystore, YubiKey).
- The relay only coordinates the *challenge* and *assertion* ceremonies and caches the public keys/credential IDs.
- The actual verification of the signature happens **on-chain** in the Soroban smart contracts.

## 2. Gas Sponsoring
The relay acts as a sponsor for gas fees via the Launchtube integration.
- The user signs the Soroban XDR transaction on their device.
- The relay receives the *already signed* XDR.
- The relay wraps it in a fee-bump transaction and pays the network fee.
- **The relay cannot alter the transaction payload**, because doing so would invalidate the user's signature.

## 3. Social Recovery
For social recovery, the relay acts purely as an **orchestrator and notification service**.
- Guardians are notified via email (Resend) when a recovery is proposed.
- Guardians approve the recovery by signing a payload.
- The relay aggregates these approvals and, upon reaching the threshold and passing the timelock, submits the final transaction to the network.
- The relay cannot arbitrarily recover a wallet because the smart contract strictly enforces the guardian threshold and cryptographic signatures.

## 4. Data Stored
The relay stores off-chain metadata to improve UI/UX and orchestration:
- **Sessions**: Temporary session scopes and expiration times for seamless dapp logins.
- **Recovery Proposals**: Pending proposals, guardian approvals, and timelocks.
- **Credential Lookups**: Mapping between a passkey `credential_id` and a `wallet_address` to route login requests correctly.
