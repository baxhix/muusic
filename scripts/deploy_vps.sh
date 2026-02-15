#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/muusic2.0"
BRANCH="${1:-main}"

echo "Deploying branch ${BRANCH} in ${APP_DIR}"
cd "${APP_DIR}"

git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

npm ci
npm run prisma:generate
npm run db:migrate
npm run build

pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo "Deploy finished"
