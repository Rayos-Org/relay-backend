# Contributing to Rayos Relay Backend

Thank you for your interest in contributing! The Rayos Relay is an open-source project and we welcome contributions of all kinds — bug fixes, new features, tests, documentation improvements, and more.

---

## 📋 Before You Start

- Read the [Trust Model](./TRUST.md) to understand the security constraints.
- Check [open issues](https://github.com/Rayos-Org/relay-backend/issues) to see what's needed.
- For large changes, open an issue first to discuss the approach.

---

## 🔧 Development Setup

Follow the [SETUP.md](./SETUP.md) guide to get the project running locally.

---

## 📐 Code Style

We use **ESLint** and **Prettier** to enforce consistent formatting.

```bash
pnpm lint    # Check and auto-fix lint errors
pnpm format  # Run Prettier
```

- All files must pass lint with **zero errors** (warnings are OK).
- Use **single quotes** for strings in TypeScript.
- Keep functions small and single-purpose.

---

## 🌿 Branching & Commits

**Branch naming:**

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<name>` | `feat/guardian-notifications` |
| Bug fix | `fix/<name>` | `fix/redis-connection-leak` |
| Documentation | `docs/<name>` | `docs/trust-model` |
| Chore / CI | `chore/<name>` | `chore/update-dependencies` |

**Commit messages** follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
feat: add guardian email notification on recovery proposal
fix: handle expired redis challenge gracefully
docs: improve TRUST.md with recovery flow details
chore: upgrade @nestjs/common to v10.5
test: add e2e coverage for /relay/submit
```

---

## ✅ Pull Request Checklist

Before submitting your PR, please ensure:

- [ ] `pnpm run lint` passes with no errors
- [ ] `pnpm exec tsc --noEmit` passes (no TypeScript errors)
- [ ] `pnpm run test:e2e` passes
- [ ] New features include corresponding tests or documentation updates
- [ ] PR description clearly explains **what** changed and **why**

---

## 🚀 Submitting a Pull Request

1. Fork the repository and create a branch from `main`.
2. Make your changes following the guidelines above.
3. Push to your fork and open a Pull Request to `Rayos-Org/relay-backend:main`.
4. A maintainer will review your PR. Please be patient — we will respond within a few days.
5. Once approved and CI passes, your PR will be merged.

---

## 💬 Getting Help

If you have questions, open a [GitHub Discussion](https://github.com/Rayos-Org/relay-backend/discussions) or file an [issue](https://github.com/Rayos-Org/relay-backend/issues).
