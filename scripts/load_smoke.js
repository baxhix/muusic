#!/usr/bin/env node

import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.LOAD_BASE_URL || 'http://127.0.0.1:3001';
const TOTAL_USERS = Number(process.env.LOAD_USERS || 1000);
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 80);
const LOAD_OUTPUT = String(process.env.LOAD_OUTPUT || '').trim();

const ENDPOINTS = [
  '/api/shows?page=1&limit=20',
  '/api/map-users?limit=180&scanPages=4'
];

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

async function runSingleRequest(path) {
  const startedAt = performance.now();
  let status = 0;
  let cache = 'NONE';
  try {
    const response = await fetch(`${BASE_URL}${path}`, { method: 'GET' });
    status = response.status;
    cache = response.headers.get('x-cache') || 'NONE';
    await response.arrayBuffer();
  } catch {
    status = 0;
  }
  const durationMs = performance.now() - startedAt;
  return { path, status, cache, durationMs };
}

async function runWorkload(path) {
  const startedAt = performance.now();
  const durations = [];
  const statuses = new Map();
  const cacheStats = new Map();
  let completed = 0;

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      const idx = completed;
      if (idx >= TOTAL_USERS) return;
      completed += 1;
      const result = await runSingleRequest(path);
      durations.push(result.durationMs);
      statuses.set(result.status, (statuses.get(result.status) || 0) + 1);
      cacheStats.set(result.cache, (cacheStats.get(result.cache) || 0) + 1);
    }
  });

  await Promise.all(workers);
  const totalMs = performance.now() - startedAt;

  return {
    path,
    totalRequests: durations.length,
    totalMs: round(totalMs),
    rps: round((durations.length * 1000) / Math.max(totalMs, 1)),
    avgMs: round(durations.reduce((sum, value) => sum + value, 0) / Math.max(durations.length, 1)),
    p95Ms: round(percentile(durations, 95)),
    p99Ms: round(percentile(durations, 99)),
    statuses: Object.fromEntries(Array.from(statuses.entries()).sort((a, b) => a[0] - b[0])),
    cache: Object.fromEntries(Array.from(cacheStats.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))
  };
}

async function main() {
  console.log(`Running load smoke against ${BASE_URL}`);
  console.log(`Virtual users/requests per endpoint: ${TOTAL_USERS}, concurrency: ${CONCURRENCY}`);
  const reports = [];
  for (const path of ENDPOINTS) {
    // Warmup to increase cache hit ratio visibility.
    for (let i = 0; i < 12; i += 1) {
      await runSingleRequest(path);
    }
    const report = await runWorkload(path);
    reports.push(report);
    console.log('\n---');
    console.log(`Endpoint: ${report.path}`);
    console.log(`Requests: ${report.totalRequests} in ${report.totalMs}ms`);
    console.log(`RPS: ${report.rps}`);
    console.log(`Avg: ${report.avgMs}ms | P95: ${report.p95Ms}ms | P99: ${report.p99Ms}ms`);
    console.log(`Status: ${JSON.stringify(report.statuses)}`);
    console.log(`Cache: ${JSON.stringify(report.cache)}`);
  }
  const output = {
    at: new Date().toISOString(),
    baseUrl: BASE_URL,
    users: TOTAL_USERS,
    concurrency: CONCURRENCY,
    reports
  };
  if (LOAD_OUTPUT) {
    const outputPath = path.resolve(LOAD_OUTPUT);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nSaved JSON report to: ${outputPath}`);
  }
  console.log('\n=== JSON SUMMARY ===');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
