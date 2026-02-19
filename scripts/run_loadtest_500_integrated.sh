#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(pwd)}"
REPORT_DIR="${LOAD_REPORT_DIR:-${ROOT_DIR}/output/load-tests}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
USERS="${LOAD_USERS:-500}"
CONCURRENCY="${LOAD_CONCURRENCY:-40}"
BASE_URL="${LOAD_BASE_URL:-http://127.0.0.1:3001}"
OUT_FILE="${REPORT_DIR}/integrated-500-${STAMP}.json"

mkdir -p "${REPORT_DIR}"

echo "[integrated-500] base=${BASE_URL} users=${USERS} concurrency=${CONCURRENCY}"

LOAD_BASE_URL="${BASE_URL}" \
LOAD_USERS="${USERS}" \
LOAD_CONCURRENCY="${CONCURRENCY}" \
LOAD_OUTPUT="${OUT_FILE}" \
node "${ROOT_DIR}/scripts/loadtest_500_integrated.js"

echo "[integrated-500] report: ${OUT_FILE}"

