#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(pwd)}"
REPORT_DIR="${LOAD_REPORT_DIR:-${ROOT_DIR}/output/load-tests}"
BASE_URL="${LOAD_BASE_URL:-http://127.0.0.1:3001}"
USERS="${LOAD_USERS:-1000}"
CONCURRENCY="${LOAD_CONCURRENCY:-80}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
JSON_REPORT="${REPORT_DIR}/load-smoke-${STAMP}.json"
LOG_REPORT="${REPORT_DIR}/load-smoke-${STAMP}.log"

mkdir -p "${REPORT_DIR}"

echo "[load-smoke] running against ${BASE_URL} (users=${USERS}, concurrency=${CONCURRENCY})"
LOAD_BASE_URL="${BASE_URL}" \
LOAD_USERS="${USERS}" \
LOAD_CONCURRENCY="${CONCURRENCY}" \
LOAD_OUTPUT="${JSON_REPORT}" \
node "${ROOT_DIR}/scripts/load_smoke.js" | tee "${LOG_REPORT}"

echo "[load-smoke] report json: ${JSON_REPORT}"
echo "[load-smoke] report log : ${LOG_REPORT}"

