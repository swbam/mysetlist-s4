#!/usr/bin/env bash
set -euo pipefail

# mastersetup.sh - One-shot setup for MySetlist (Next-Forge web)
# - Installs deps, validates env, prepares DB, seeds data, warms caches, builds
# - Safe to re-run; idempotent where possible

log() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m✖ %s\033[0m\n" "$*"; }

ROOT_DIR=$(pwd)
WEB_DIR="$ROOT_DIR/apps/web"
DB_PKG_DIR="$ROOT_DIR/packages/database"

log "Environment summary"
node -v || warn "Node not found in PATH"
pnpm -v || warn "pnpm not found in PATH"

log "Installing dependencies (pnpm install)"
pnpm install --frozen-lockfile

log "Copying env templates if missing"
[ -f "$ROOT_DIR/.env.local" ] || { [ -f "$ROOT_DIR/.env.example" ] && cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env.local" || true; }
[ -f "$WEB_DIR/.env.local" ] || { [ -f "$WEB_DIR/.env.example" ] && cp "$WEB_DIR/.env.example" "$WEB_DIR/.env.local" || true; }

log "Validating environment variables"
pnpm run check:env || warn "check:env reported issues"
pnpm run check:env:apis || warn "check:env:apis reported issues"

log "Database: generate types & push schema"
(cd "$DB_PKG_DIR" && pnpm generate || true)
(cd "$DB_PKG_DIR" && pnpm push || true)

log "Seeding development data (light)"
pnpm run seed || warn "seed script optional/failed"

log "Initialize trending/materialized data"
pnpm run init:trending || warn "init:trending optional/failed"

log "Build web app (Turborepo)"
pnpm run build || { err "Build failed"; exit 1; }

log "All set! Common next steps:"
echo "- Start dev: pnpm dev"
echo "- Open web app: http://localhost:3001"

echo "Setup complete!"
