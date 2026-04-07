'use strict';

/**
 * lib/db.js — Database connection module for GRUDA Legion
 *
 * Manages a PostgreSQL connection pool (via `pg`) and a Redis client
 * (via `redis` v4). Both are optional: if the corresponding env var is
 * absent the module degrades gracefully and reports "unconfigured" in
 * health checks.
 *
 * Usage:
 *   const db = require('./lib/db');
 *   await db.init();          // call once at startup
 *   const pool = db.getDb();  // pg Pool instance (or null)
 *   const redis = db.getRedis(); // Redis client (or null)
 */

const { Pool } = require('pg');
const { createClient } = require('redis');

// ── Internal state ────────────────────────────────────────────────────────────

let _pool = null;   // pg.Pool
let _redis = null;  // Redis client

const _status = {
  postgres: 'unconfigured', // unconfigured | connecting | ready | error
  redis:    'unconfigured',
  postgresError: null,
  redisError:    null
};

// ── PostgreSQL ────────────────────────────────────────────────────────────────

async function initPostgres() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('⚠️  DATABASE_URL not set — PostgreSQL disabled');
    _status.postgres = 'unconfigured';
    return;
  }

  _status.postgres = 'connecting';
  console.log('🐘 Connecting to PostgreSQL...');

  _pool = new Pool({
    connectionString: url,
    // Railway Postgres uses SSL in production; accept self-signed certs
    ssl: url.includes('railway') || url.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });

  // Surface pool-level errors so they don't crash the process
  _pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err.message);
    _status.postgres = 'error';
    _status.postgresError = err.message;
  });

  // Verify connectivity with a lightweight query
  try {
    const client = await _pool.connect();
    await client.query('SELECT 1');
    client.release();
    _status.postgres = 'ready';
    _status.postgresError = null;
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    _status.postgres = 'error';
    _status.postgresError = err.message;
    console.error('❌ PostgreSQL connection failed:', err.message);
    // Don't throw — server can still start without DB
  }
}

// ── Redis ─────────────────────────────────────────────────────────────────────

async function initRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('⚠️  REDIS_URL not set — Redis disabled');
    _status.redis = 'unconfigured';
    return;
  }

  _status.redis = 'connecting';
  console.log('🔴 Connecting to Redis...');

  _redis = createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('❌ Redis: too many reconnect attempts, giving up');
          return new Error('Redis reconnect limit reached');
        }
        const delay = Math.min(retries * 200, 3000);
        console.warn(`⚠️  Redis reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      }
    }
  });

  _redis.on('error', (err) => {
    // Only log once per error type to avoid log spam
    if (_status.redis !== 'error') {
      console.error('❌ Redis client error:', err.message);
    }
    _status.redis = 'error';
    _status.redisError = err.message;
  });

  _redis.on('ready', () => {
    _status.redis = 'ready';
    _status.redisError = null;
    console.log('✅ Redis connected');
  });

  _redis.on('reconnecting', () => {
    _status.redis = 'connecting';
  });

  try {
    await _redis.connect();
    // Verify with a PING
    await _redis.ping();
    _status.redis = 'ready';
    _status.redisError = null;
    console.log('✅ Redis ready');
  } catch (err) {
    _status.redis = 'error';
    _status.redisError = err.message;
    console.error('❌ Redis connection failed:', err.message);
    // Don't throw — server can still start without Redis
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialize both database connections. Safe to call multiple times —
 * subsequent calls are no-ops if already initialised.
 */
async function init() {
  await Promise.all([initPostgres(), initRedis()]);
}

/** Returns the pg.Pool instance, or null if Postgres is not configured. */
function getDb() {
  return _pool;
}

/** Returns the Redis client instance, or null if Redis is not configured. */
function getRedis() {
  return _redis;
}

/**
 * Returns a snapshot of the current connection status for both databases.
 * Shape: { postgres: string, redis: string, postgresError: string|null, redisError: string|null }
 */
function getStatus() {
  return { ..._status };
}

/**
 * Gracefully close both connections. Call during server shutdown.
 */
async function close() {
  const tasks = [];
  if (_pool) tasks.push(_pool.end().catch((e) => console.warn('pg pool close error:', e.message)));
  if (_redis && _redis.isOpen) tasks.push(_redis.quit().catch((e) => console.warn('redis quit error:', e.message)));
  await Promise.all(tasks);
  console.log('🛑 Database connections closed');
}

module.exports = { init, getDb, getRedis, getStatus, close };
