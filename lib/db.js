const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { log } = require('./telemetry');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false }
    });
    log('info', 'postgres_pool_initialized');
  }
  return pool;
}

async function query(text, params = []) {
  const pg = getPool();
  if (!pg) {
    throw new Error('DATABASE_URL is not configured. Postgres mode is unavailable.');
  }
  return pg.query(text, params);
}

async function healthcheck() {
  const pg = getPool();
  if (!pg) return { enabled: false, ok: false, mode: 'local-json-fallback' };
  try {
    await pg.query('select 1');
    return { enabled: true, ok: true, mode: 'postgres' };
  } catch (error) {
    return { enabled: true, ok: false, mode: 'postgres', message: error.message };
  }
}

async function runSqlFile(fileName) {
  const pg = getPool();
  if (!pg) return { ok: false, mode: 'local-json-fallback', skipped: true };
  const filePath = path.join(__dirname, '..', 'db', 'migrations', fileName);
  const sql = fs.readFileSync(filePath, 'utf8');
  await pg.query(sql);
  return { ok: true, fileName };
}

module.exports = { getPool, query, healthcheck, runSqlFile };
