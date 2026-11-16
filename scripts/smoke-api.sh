#!/usr/bin/env bash
# Smoke-tests the public API (docs/public-api.md) against a running vault. Each API phase adds its
# endpoints here. Usage:
#   VAULT_API_KEY=pmv_… [VAULT_NO_GRANTS_API_KEY=pmv_…] bash scripts/smoke-api.sh
# Create the apps and keys on /dashboard/apps, then set their grants on /dashboard/permissions:
# - VAULT_API_KEY: write grants for activity, sleep, diet and mood capped at Protected, and NO
#   write grant for health (the write checks expect a health fact to be withheld).
# - VAULT_NO_GRANTS_API_KEY (optional): an app with no grants at all, for the 403 and the
#   cross-app retract checks. Without it, those checks are skipped.
# VAULT_URL defaults to http://localhost:3000. The write checks call the AI, so they take a few
# seconds each. Everything written is retracted at the end. Exits non-zero on the first failure.
set -euo pipefail

BASE="${VAULT_URL:-http://localhost:3000}/api/v1"
: "${VAULT_API_KEY:?Set VAULT_API_KEY to the API key of a connected app}"
NO_GRANTS_KEY="${VAULT_NO_GRANTS_API_KEY:-}"

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

# refute <description> <text the body must not contain>: run after `expect`.
refute() {
  if grep -qF -- "$2" "$BODY"; then
    echo "FAIL  $1: body contains $2"
    cat "$BODY"
    echo
    exit 1
  fi
}

# field <name>: the first string value of "<name>" in the last response body.
field() {
  grep -o "\"$1\":\"[^\"]*\"" "$BODY" | head -1 | cut -d'"' -f4
}

skip() {
  echo "skip  $1 (set VAULT_NO_GRANTS_API_KEY)"
}

AUTH=(-H "Authorization: Bearer $VAULT_API_KEY")
NO_GRANTS_AUTH=(-H "Authorization: Bearer $NO_GRANTS_KEY")
JSON=(-H "Content-Type: application/json")
# A unique prefix per run, so external ids never collide with an earlier run's.
RUN="smoke-$(date +%s)"

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

# ── Write (Phase 07) ──
request POST /memories "${JSON[@]}" --data '{"content":"Ran 5 km this morning."}'
expect "POST /memories without a key → 401" 401 '"code":"unauthorized"'

request POST /memories "${AUTH[@]}" "${JSON[@]}" --data '{"content":"Ran 5 km.","bogus":true}'
expect "POST /memories with an unknown field → 400" 400 '"code":"validation_error"'

request POST /memories "${AUTH[@]}" "${JSON[@]}" \
  --data '{"content":"Ran 5 km.","messages":[{"role":"user","content":"Ran 5 km."}]}'
expect "POST /memories with both content and messages → 400" 400 '"code":"validation_error"'

request POST /memories "${AUTH[@]}" "${JSON[@]}" --data '{"tags":["running"]}'
expect "POST /memories with neither content nor messages → 400" 400 '"code":"validation_error"'

if [[ -n "$NO_GRANTS_KEY" ]]; then
  request POST /memories "${NO_GRANTS_AUTH[@]}" "${JSON[@]}" \
    --data '{"content":"Ran 5 km this morning."}'
  expect "POST /memories with no write grants → 403 (before any AI call)" 403 \
    '"code":"write_denied"'
else
  skip "POST /memories with no write grants → 403"
fi

RUN_5K="{\"content\":\"Ran 5 km along the river this morning.\",\"provenance\":\"user_stated\",\
\"sessionId\":\"$RUN\",\"externalId\":\"$RUN-5k\""
request POST /memories "${AUTH[@]}" "${JSON[@]}" --data "$RUN_5K,\"dryRun\":true}"
expect "POST /memories dryRun → 201, nothing stored" 201 '"dryRun":true' '"id":null' \
  '"category":"activity"'

request POST /memories "${AUTH[@]}" "${JSON[@]}" --data "$RUN_5K}"
expect "POST /memories after the dry run, same externalId → stored (the dry run stored nothing)" \
  201 '"dryRun":false' '"duplicates":0' '"category":"activity"'
refute "POST /memories after the dry run" '"id":null'
FIRST_ID="$(field id)"

JOURNAL="{\"content\":\"Journal: Slept 7 hours and woke up rested. At the clinic today I was \
diagnosed with asthma.\",\"contentType\":\"journal\",\"provenance\":\"user_stated\",\
\"occurredAt\":\"2026-11-16T21:00:00+05:30\",\"timezone\":\"Asia/Kolkata\",\
\"sessionId\":\"$RUN\",\"externalId\":\"$RUN-journal\"}"
request POST /memories "${AUTH[@]}" "${JSON[@]}" --data "$JOURNAL"
expect "POST /memories journal → sleep stored, health withheld" 201 '"category":"sleep"' \
  '{"category":"health","reason":"no_write_grant"}'

request POST /memories "${AUTH[@]}" "${JSON[@]}" --data "{\"messages\":[\
{\"role\":\"user\",\"content\":\"Did a 5k this morning, knee felt a bit sore after.\"},\
{\"role\":\"assistant\",\"content\":\"Nice! Ice it tonight.\"}],\"contentType\":\"conversation\",\
\"provenance\":\"user_stated\",\"occurredAt\":\"2026-11-16T07:30:00+05:30\",\
\"timezone\":\"Asia/Kolkata\",\"domain\":\"fitness\",\"sessionId\":\"$RUN\"}"
expect "POST /memories transcript → activity stored" 201 '"category":"activity"'

request POST /memories "${AUTH[@]}" "${JSON[@]}" --data "{\"content\":\"Did 30 minutes of yoga \
this evening.\",\"sensitivityFloor\":\"protected\",\"sessionId\":\"$RUN\"}"
expect "POST /memories with sensitivityFloor protected → stored as protected" 201 \
  '"category":"activity"' '"sensitivity":"protected"'

request POST /memories "${AUTH[@]}" "${JSON[@]}" --data "$JOURNAL"
expect "POST /memories with a seen externalId → duplicate, nothing stored" 201 \
  '"duplicates":1' '"stored":[]'

# ── Retract (Phase 07) ──
request DELETE /memories "${JSON[@]}" --data "{\"sessionId\":\"$RUN\"}"
expect "DELETE /memories without a key → 401" 401 '"code":"unauthorized"'

request DELETE /memories "${AUTH[@]}" "${JSON[@]}" --data '{}'
expect "DELETE /memories with no criteria → 400" 400 '"code":"validation_error"'

request DELETE /memories "${AUTH[@]}" "${JSON[@]}" --data "{\"sessionId\":\"$RUN\",\"bogus\":1}"
expect "DELETE /memories with an unknown field → 400" 400 '"code":"validation_error"'

if [[ -n "$NO_GRANTS_KEY" ]]; then
  request DELETE /memories "${NO_GRANTS_AUTH[@]}" "${JSON[@]}" --data "{\"ids\":[\"$FIRST_ID\"]}"
  expect "DELETE /memories of another app's memory → nothing deleted" 200 '"deleted":0'
else
  skip "DELETE /memories of another app's memory → nothing deleted"
fi

request DELETE /memories "${AUTH[@]}" "${JSON[@]}" --data "{\"externalIds\":[\"$RUN-5k\"]}"
expect "DELETE /memories by externalIds → 200" 200 '"deleted":'
refute "DELETE /memories by externalIds" '"deleted":0'

request DELETE /memories "${AUTH[@]}" "${JSON[@]}" --data "{\"sessionId\":\"$RUN\"}"
expect "DELETE /memories by sessionId → the rest of this run" 200 '"deleted":'
refute "DELETE /memories by sessionId" '"deleted":0'

request DELETE /memories "${AUTH[@]}" "${JSON[@]}" --data "{\"sessionId\":\"$RUN\"}"
expect "DELETE /memories again → nothing left" 200 '"deleted":0'

echo "All smoke checks passed."
