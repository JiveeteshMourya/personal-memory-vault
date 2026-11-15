#!/usr/bin/env bash
# Smoke-tests the public API (docs/public-api.md) against a running vault. Each API phase adds its
# endpoints here. Usage:
#   VAULT_API_KEY=pmv_… bash scripts/smoke-api.sh
# VAULT_API_KEY is a connected app's key (create one on /dashboard/apps). VAULT_URL defaults to
# http://localhost:3000. Exits non-zero on the first failure.
set -euo pipefail

BASE="${VAULT_URL:-http://localhost:3000}/api/v1"
: "${VAULT_API_KEY:?Set VAULT_API_KEY to the API key of a connected app}"

BODY="$(mktemp)"
trap 'rm -f "$BODY"' EXIT

# request <method> <path> [curl args…]: sets STATUS and writes the response body to $BODY.
request() {
  local method="$1" path="$2"
  shift 2
  STATUS="$(curl -sS -o "$BODY" -w '%{http_code}' -X "$method" "$BASE$path" "$@")"
}

# expect <description> <status> [text the body must contain…]
expect() {
  local description="$1" status="$2"
  shift 2
  if [[ "$STATUS" != "$status" ]]; then
    echo "FAIL  $description: expected $status, got $STATUS"
    cat "$BODY"
    echo
    exit 1
  fi
  local needle
  for needle in "$@"; do
    if ! grep -qF -- "$needle" "$BODY"; then
      echo "FAIL  $description: body lacks $needle"
      cat "$BODY"
      echo
      exit 1
    fi
  done
  echo "ok    $description"
}

AUTH=(-H "Authorization: Bearer $VAULT_API_KEY")

# ── Health ──
request GET /health
expect "GET /health" 200 '"status":"ok"'

# ── Permissions (Phase 06) ──
request GET /permissions
expect "GET /permissions without a key → 401" 401 '"code":"unauthorized"'

request GET /permissions -H "Authorization: Bearer pmv_not-a-real-key"
expect "GET /permissions with a garbage key → 401" 401 '"code":"unauthorized"'

request GET /permissions "${AUTH[@]}"
expect "GET /permissions with a key → 200" 200 '"app":' '"write":' '"read":' '"sources":' \
  '"otherAppsCount":' '"id":"identity"' '"id":"other"' '"id":"protected"'

echo "All smoke checks passed."
