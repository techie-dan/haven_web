#!/usr/bin/env bash
# ============================================================================
#  Integration health check — Supabase, Mailgun, Google
#
#  Run from the project root:   bash scripts/check-integrations.sh
#
#  Prints ONLY pass/fail status. It never echoes an API key, token or secret.
#  Read-only: it sends no email and writes no rows.
# ============================================================================

cd "$(dirname "$0")/.." || exit 1

ENV_FILE=".env.local"
pass=0; fail=0; warn=0

ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); }
note() { printf '  \033[33mWARN\033[0m  %s\n' "$1"; warn=$((warn+1)); }
section() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# Read a var from .env.local without sourcing (handles inline comments + quotes).
get() {
  [ -f "$ENV_FILE" ] || return 0
  grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null \
    | cut -d= -f2- \
    | sed 's/[[:space:]]*#.*$//' \
    | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' \
    | sed 's/^"//; s/"$//' \
    | tr -d '\r'
}

is_placeholder() {
  case "$1" in
    ""|*your-*|*your_*|*xxxx*|*placeholder*|*changeme*|*your-project-ref*) return 0 ;;
    *) return 1 ;;
  esac
}

# ---------------------------------------------------------------------------
section "0. Environment file"
if [ ! -f "$ENV_FILE" ]; then
  bad "$ENV_FILE does not exist — copy .env.example to .env.local and fill it in"
else
  ok "$ENV_FILE exists"
fi

for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY \
         SUPABASE_SERVICE_ROLE_KEY MAILGUN_API_KEY MAILGUN_DOMAIN \
         NEXT_PUBLIC_GOOGLE_CLIENT_ID; do
  val=$(get "$v")
  if [ -z "$val" ]; then
    bad "$v is missing or empty"
  elif is_placeholder "$val"; then
    bad "$v is still a placeholder value"
  else
    ok "$v is set"
  fi
done

SUPA_URL=$(get NEXT_PUBLIC_SUPABASE_URL)
ANON=$(get NEXT_PUBLIC_SUPABASE_ANON_KEY)
SVC=$(get SUPABASE_SERVICE_ROLE_KEY)
MG_KEY=$(get MAILGUN_API_KEY)
MG_DOMAIN=$(get MAILGUN_DOMAIN)
MG_BASE=$(get MAILGUN_API_BASE); [ -z "$MG_BASE" ] && MG_BASE="https://api.mailgun.net"
MG_BASE=$(printf '%s' "$MG_BASE" | sed 's#/+$##; s#/v3$##')
GID=$(get NEXT_PUBLIC_GOOGLE_CLIENT_ID)
FROM=$(get MAILGUN_FROM)

# ---------------------------------------------------------------------------
section "1. Supabase — network + database"

if is_placeholder "$SUPA_URL"; then
  bad "cannot test Supabase — NEXT_PUBLIC_SUPABASE_URL is not a real URL"
else
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    "$SUPA_URL/auth/v1/health" -H "apikey: $ANON")
  if [ "$code" = "200" ]; then ok "project is reachable (auth health 200)"
  else bad "project unreachable (auth health returned $code)"; fi

  # Each table, using the service key so RLS cannot mask a missing table.
  for t in products categories orders order_items subscribers profiles; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
      "$SUPA_URL/rest/v1/$t?select=*&limit=1" \
      -H "apikey: $SVC" -H "Authorization: Bearer $SVC")
    case "$code" in
      200) ok "table '$t' exists" ;;
      404) bad "table '$t' MISSING — run the migration" ;;
      401|403) bad "table '$t' — service key rejected ($code)" ;;
      *) bad "table '$t' — unexpected response $code" ;;
    esac
  done

  # Seeded catalogue: the silent empty-basket bug.
  hdr=$(curl -s -D - -o /dev/null --max-time 10 \
    "$SUPA_URL/rest/v1/products?select=slug" \
    -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
    -H "Prefer: count=exact" -H "Range: 0-0")
  n=$(printf '%s' "$hdr" | grep -i '^content-range' | tr -d '\r' | sed 's#.*/##')
  if [ -z "$n" ]; then
    note "could not read the product count"
  elif [ "$n" = "0" ]; then
    bad "products table is EMPTY — run supabase/seed.sql (orders will save with no line items)"
  else
    ok "products table is seeded ($n rows)"
  fi

  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    "$SUPA_URL/rest/v1/orders?select=order_number&limit=1" -H "apikey: $ANON")
  if [ "$code" = "200" ] || [ "$code" = "401" ] || [ "$code" = "403" ]; then
    ok "anon key is valid"
  else
    bad "anon key looks wrong (got $code)"
  fi
fi

# ---------------------------------------------------------------------------
section "2. Mailgun — credentials (no email is sent)"

if is_placeholder "$MG_KEY"; then
  bad "cannot test Mailgun — MAILGUN_API_KEY is missing or a placeholder"
else
  code=$(curl -s -o /tmp/mg_domains.$$ -w '%{http_code}' --max-time 15 \
    -u "api:$MG_KEY" "$MG_BASE/v3/domains?limit=100")
  if [ "$code" = "200" ]; then
    ok "API key is valid"
    if printf '%s' "$MG_DOMAIN" | grep -q 'your-domain'; then
      bad "MAILGUN_DOMAIN is still a placeholder"
    elif grep -q "\"name\":[[:space:]]*\"$MG_DOMAIN\"" /tmp/mg_domains.$$ 2>/dev/null; then
      ok "MAILGUN_DOMAIN exists on this account"
    else
      bad "MAILGUN_DOMAIN was not found on this account — check the spelling"
    fi
  elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
    bad "API key rejected ($code) — use a *sending* key, not the private API key"
  else
    note "unexpected Mailgun response: $code"
  fi
  rm -f /tmp/mg_domains.$$

  if [ -n "$FROM" ] && ! printf '%s' "$FROM" | grep -q "$MG_DOMAIN"; then
    note "MAILGUN_FROM is not on MAILGUN_DOMAIN — Mailgun rejects unverified From addresses"
  fi
  if printf '%s' "$MG_DOMAIN" | grep -q 'sandbox'; then
    note "sandbox domain: delivery only reaches Authorized Recipients in the Mailgun dashboard"
  fi
fi

# ---------------------------------------------------------------------------
section "3. Google — client id (the sign-in button)"

if is_placeholder "$GID"; then
  bad "NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing or a placeholder — the button stays disabled"
elif printf '%s' "$GID" | grep -q '\.apps\.googleusercontent\.com$'; then
  ok "client id has the right shape"
  note "cannot verify from here that it matches the client id configured in Supabase"
else
  bad "client id does not end in .apps.googleusercontent.com — it is not a Web client id"
fi

# ---------------------------------------------------------------------------
section "4. Code — does it compile"

if [ ! -d node_modules ]; then
  bad "node_modules missing — run: npm install"
else
  if npx --no-install tsc --noEmit >/tmp/tsc.$$ 2>&1; then
    ok "TypeScript compiles with no errors"
  else
    bad "TypeScript errors:"
    sed 's/^/        /' /tmp/tsc.$$ | head -20
  fi
  rm -f /tmp/tsc.$$
fi

# ---------------------------------------------------------------------------
section "5. Dev server (optional)"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000)
if [ "$code" = "200" ]; then
  ok "responding on http://localhost:3000"
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    "http://localhost:3000/api/orders/HVN-2000-0000")
  if [ "$code" = "404" ] || [ "$code" = "503" ]; then
    ok "order lookup endpoint responds ($code)"
  else
    note "order lookup returned $code"
  fi
else
  note "not running — start it with: npm run dev"
fi

# ---------------------------------------------------------------------------
printf '\n\033[1mResult:\033[0m %d passed, %d failed, %d warnings\n\n' "$pass" "$fail" "$warn"
[ "$fail" -eq 0 ] && printf '\033[32mAll checks passed.\033[0m\n\n' \
                  || printf '\033[31mFix the FAIL lines above, then run this again.\033[0m\n\n'
