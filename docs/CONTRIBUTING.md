# Contributing to Rayos Relay Backend

First off, thank you for considering contributing to Rayos! It's people like you that make open-source a great community.

## 1. Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/relay-backend.git
   cd relay-backend
   ```
3. Follow the setup instructions in [docs/SETUP.md](./SETUP.md).

## 2. Development Workflow

1. **Branching**: Create a new branch for your feature or bugfix.
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. **Commiting**: We follow [Conventional Commits](https://www.conventionalcommits.org/).
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation updates
   - `chore:` for routine tasks
3. **Linting & Formatting**: Ensure your code passes all linters.
   ```bash
   pnpm run lint
   pnpm run format
   ```
4. **Testing**: Add unit or E2E tests for new features.
   ```bash
   pnpm run test:e2e
   ```

## 3. Pull Requests

1. Push your branch to your fork.
2. Open a Pull Request against the `main` branch of `Rayos-Org/relay-backend`.
3. Provide a clear description of the problem and the solution.
4. Wait for CI checks to pass and a maintainer to review your code.

## 4. Code of Conduct
Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.
