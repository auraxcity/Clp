#!/usr/bin/env bash
# Sync environment variables from .env.local to the linked Vercel project.
# Uses `vercel env update` so it is safe to re-run (updates all environments per variable).
# Run: ./scripts/vercel-env-setup.sh
# Requires: Vercel CLI (`vercel link`) and a populated `.env.local`.

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local. Copy .env.local.example to .env.local and fill in values."
  exit 1
fi

if [[ -x ./node_modules/.bin/vercel ]]; then
  VERCEL=./node_modules/.bin/vercel
elif command -v vercel &>/dev/null; then
  VERCEL=vercel
else
  echo "Install dependencies first: npm install"
  exit 1
fi

VARS=(
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_PROJECT_ID
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  NEXT_PUBLIC_FIREBASE_APP_ID
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  FIREBASE_ADMIN_PROJECT_ID
  FIREBASE_ADMIN_CLIENT_EMAIL
  FIREBASE_ADMIN_PRIVATE_KEY
)

source_env() {
  local name="$1"
  local line
  line=$(grep -m1 "^${name}=" .env.local 2>/dev/null || true)
  if [[ -z "$line" ]]; then
    return
  fi
  local value="${line#*=}"
  if [[ "$value" =~ ^\"(.*)\"$ ]]; then
    value="${BASH_REMATCH[1]}"
  fi
  if [[ "$name" == "FIREBASE_ADMIN_PRIVATE_KEY" ]]; then
    value="${value//\\n/$'\n'}"
  fi
  printf '%s' "$value"
}

echo "Syncing env vars to Vercel (Production, Preview, Development via single update)..."
for name in "${VARS[@]}"; do
  value=$(source_env "$name")
  if [[ -z "$value" ]]; then
    echo "  [skip] $name (empty)"
    continue
  fi
  sensitive_flag=()
  case "$name" in
    FIREBASE_ADMIN_*) sensitive_flag=(--sensitive) ;;
  esac
  if [[ "$value" != *$'\n'* ]]; then
    $VERCEL env update "$name" --value "$value" --yes "${sensitive_flag[@]}"
    echo "  [ok] $name"
  else
    printf '%s' "$value" | $VERCEL env update "$name" --yes "${sensitive_flag[@]}"
    echo "  [ok] $name (multiline)"
  fi
done
echo "Done. Redeploy so NEXT_PUBLIC_* is baked into the build: $VERCEL --prod --yes"
