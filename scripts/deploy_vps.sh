#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/muusic2.0"
BRANCH="${1:-main}"

echo "Deploying branch ${BRANCH} in ${APP_DIR}"
cd "${APP_DIR}"

git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

if ! command -v npm >/dev/null 2>&1; then
  export NVM_DIR="${HOME}/.nvm"
  if [ -s "${NVM_DIR}/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "${NVM_DIR}/nvm.sh"
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm nao encontrado. Instale Node.js ou ajuste PATH/NVM." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 nao encontrado. Instale com: npm i -g pm2" >&2
  exit 1
fi

install_deps() {
  rm -rf node_modules
  npm ci --no-audit --no-fund
}

if ! install_deps; then
  echo "npm ci falhou na primeira tentativa. Limpando cache e tentando novamente..."
  npm cache clean --force || true
  install_deps
fi

npm run prisma:generate
npm run db:migrate
npm run build

pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

./scripts/post_deploy_smoke.sh

echo "Deploy finished"
