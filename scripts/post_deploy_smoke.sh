#!/usr/bin/env bash
set -euo pipefail

NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/muusic2.0}"

fail() {
  echo "[smoke][FAIL] $1" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando ausente: $1"
}

assert_contains() {
  local file="$1"
  local pattern="$2"
  local description="$3"
  grep -q "$pattern" "$file" || fail "$description"
}

need_cmd curl
need_cmd grep

if [[ ! -f "$NGINX_SITE" ]]; then
  fail "Arquivo nginx nao encontrado: $NGINX_SITE"
fi

assert_contains "$NGINX_SITE" "server_name muusic.live" "Nginx sem server_name muusic.live"
assert_contains "$NGINX_SITE" "server_name painel.muusic.live" "Nginx sem server_name painel.muusic.live"

for route in "/auth/" "/admin/" "/api/" "/health"; do
  assert_contains "$NGINX_SITE" "location $route" "Nginx sem location obrigatoria: $route"
done

for i in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:3001/health" >/dev/null; then
    break
  fi
  sleep 1
  if [[ "$i" -eq 20 ]]; then
    fail "Backend nao respondeu /health em 20s"
  fi
done

api_muusic=$(curl -fsSL -H 'Host: muusic.live' 'http://127.0.0.1/api/shows?page=1&limit=1')
echo "$api_muusic" | grep -q '"shows"' || fail "muusic.live /api/shows nao retornou JSON esperado"

api_painel=$(curl -fsSL -H 'Host: painel.muusic.live' 'http://127.0.0.1/api/shows?page=1&limit=1')
echo "$api_painel" | grep -q '"shows"' || fail "painel.muusic.live /api/shows nao retornou JSON esperado"

admin_status=$(curl -s -o /tmp/muusic-admin-smoke.out -w '%{http_code}' -H 'Host: painel.muusic.live' 'http://127.0.0.1/admin/users')
if [[ "$admin_status" != "401" && "$admin_status" != "403" ]]; then
  body=$(head -c 200 /tmp/muusic-admin-smoke.out 2>/dev/null || true)
  fail "painel.muusic.live /admin/users retornou status inesperado: $admin_status | body: $body"
fi

cors_headers_file="/tmp/muusic-cors-smoke.headers"
curl -sSL -o /dev/null -D "$cors_headers_file" \
  -X OPTIONS 'http://127.0.0.1/auth/local/login' \
  -H 'Host: muusic.live' \
  -H 'Origin: https://painel.muusic.live' \
  -H 'Access-Control-Request-Method: POST'

grep -qi '^access-control-allow-origin: https://painel.muusic.live' "$cors_headers_file" || fail "CORS entre painel.muusic.live e muusic.live nao autorizado"

echo "[smoke][OK] Rotas, CORS e endpoints criticos validados."
