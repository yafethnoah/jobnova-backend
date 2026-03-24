const { Pool } = require('pg');
const { allowLocalFallback, isProduction, hasDatabase } = require('../config/env');
const { log } = require('./telemetry');

let pool = null;
let postgresDisabledReason = '';

function disablePostgres(reason) {
  postgresDisabledReason = reason || 'unknown postgres error';
  if (pool) { try { pool.end().catch(() => undefined); } catch {} }
  pool = null;
  log(isProduction && !allowLocalFallback ? 'error' : 'warn', 'postgres_disabled', { reason: postgresDisabledReason, fallbackAllowed: allowLocalFallback });
}

function postgresSslConfig() {
  if (String(process.env.PGSSL || '').trim().toLowerCase() === 'false') return false;
  return { rejectUnauthorized: false };
}

function getPool() {
  if (!hasDatabase()) return null;
  if (postgresDisabledReason) {
    if (isProduction && !allowLocalFallback) throw new Error(`Postgres is disabled: ${postgresDisabledReason}`);
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: postgresSslConfig(),
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 3000),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
      max: Number(process.env.PG_POOL_MAX || 10)
    });
    pool.on('error', (error) => disablePostgres(error?.message || 'postgres pool error'));
    log('info', 'postgres_pool_initialized');
  }
  return pool;
}

function isConnectionFailure(message = '') {
  return /password authentication failed|no pg_hba\.conf entry|connect ECONNREFUSED|getaddrinfo ENOTFOUND|certificate|self signed|database .* does not exist|timeout expired|Connection terminated unexpectedly|ECONNRESET/i.test(String(message || ''));
}

async function query(text, params = []) {
  const pg = getPool();
  if (!pg) throw new Error(postgresDisabledReason || 'DATABASE_URL is not configured. Postgres mode is unavailable.');
  try {
    return await pg.query(text, params);
  } catch (error) {
    const message = error?.message || 'postgres query failed';
    if (isConnectionFailure(message)) {
      disablePostgres(message);
      if (isProduction && !allowLocalFallback) throw new Error(`Postgres connection failed: ${message}`);
    }
    throw error;
  }
}

async function healthcheck() {
  if (!hasDatabase()) return { enabled: false, ok: false, mode: allowLocalFallback ? 'local-json-fallback' : 'database-required', reason: 'DATABASE_URL missing' };
  if (postgresDisabledReason) return { enabled: true, ok: false, mode: allowLocalFallback ? 'local-json-fallback' : 'database-required', reason: postgresDisabledReason };
  const pg = getPool();
  if (!pg) return { enabled: false, ok: false, mode: allowLocalFallback ? 'local-json-fallback' : 'database-required', reason: postgresDisabledReason || 'postgres unavailable' };
  try {
    await pg.query('select 1');
    return { enabled: true, ok: true, mode: 'postgres' };
  } catch (error) {
    const message = error?.message || 'postgres healthcheck failed';
    disablePostgres(message);
    return { enabled: true, ok: false, mode: allowLocalFallback ? 'local-json-fallback' : 'database-required', message };
  }
}

async function runSqlFile(fileName) {
  const fs = require('fs');
  const path = require('path');
  const pg = getPool();
  if (!pg) return { ok: false, mode: allowLocalFallback ? 'local-json-fallback' : 'database-required', skipped: true, reason: postgresDisabledReason || 'postgres unavailable' };
  const filePath = path.join(__dirname, '..', 'db', 'migrations', fileName);
  const sql = fs.readFileSync(filePath, 'utf8');
  await query(sql);
  return { ok: true, fileName, mode: 'postgres' };
}

function getPostgresDisabledReason() { return postgresDisabledReason; }
module.exports = { getPool, query, healthcheck, runSqlFile, disablePostgres, getPostgresDisabledReason };
