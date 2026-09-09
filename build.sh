#!/usr/bin/env bash
# Render build script — runs at build time on Render
set -e

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Compiling TypeScript..."
pnpm exec nest build

echo "==> Build complete. dist/main.js is ready."
