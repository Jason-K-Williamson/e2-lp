#!/usr/bin/env bash
# Build + deploy e2-landing to Cloudflare Workers (workwith.e2.agency)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  cat <<'EOF'
Missing CLOUDFLARE_API_TOKEN.

One-time setup:
  1. Open https://dash.cloudflare.com/profile/api-tokens
  2. Create Token → template "Edit Cloudflare Workers"
  3. Add to .env (never commit this file):
       CLOUDFLARE_API_TOKEN=your_token_here

See docs/DEPLOY.md for GitHub auto-deploy (push to main = live).
EOF
  exit 1
fi

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-c1d72867c2217c519e52d4d575609eb0}"

echo "→ Building…"
npm run build

echo "→ Deploying to Cloudflare Workers…"
npx wrangler deploy

echo "✓ Live at https://workwith.e2.agency"
