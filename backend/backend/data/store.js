const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { query, getPool, disablePostgres } = require('../lib/db');
const { allowLocalFallback, isProduction } = require('../config/env');

const DB_FILE = path.join(__dirname, 'db.json');
const DB_ENABLED = () => Boolean(getPool());

function nowIso() {
  return new Date().toISOString();
}

function createUserData() {
  return {
    onboarding: {},
    applications: [
      { id: `app-${Date.now()}`, company: 'RBC', role: 'HR Coordinator', status: 'applied', followUpDate: '2026-03-18', notes: 'Applied through company portal', createdAt: nowIso() },
      { id: `app-${Date.now() + 1}`, company: 'Sheridan College', role: 'People & Culture Assistant', status: 'saved', notes: 'Need tailored resume version', createdAt: nowIso() }
    ],
    resources: [
      { id: 'res-1', title: 'Employment Ontario', description: 'Employment services, training, job support, and local programs.', url: 'https://www.ontario.ca/page/employment-ontario', category: 'Employment', official: true },
      { id: 'res-2', title: 'Job Bank', description: 'Canadian job postings, career planning, and labour market information.', url: 'https://www.jobbank.gc.ca/home', category: 'Jobs', official: true },
      { id: 'res-3', title: 'Credential Recognition in Ontario', description: 'Support for internationally trained professionals and regulated occupations.', url: 'https://www.ontario.ca/page/ontario-bridge-training-program', category: 'Credentials', official: true }
    ],
    resumes: [],
    resumeVersions: [],
    exportLibrary: [],
    atsResults: [],
    autopilotPackages: [],
    interviewSessions: [],
    liveSessions: {},
    careerPath: null
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;
  const [salt, key] = String(storedHash).split(':');
  if (!salt || !key) return false;
  const hashBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (hashBuffer.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, keyBuffer);
}

const defaultUserId = 'user-1';
const shouldSeedDemoUser = !isProduction && allowLocalFallback;
const defaultUsers = shouldSeedDemoUser ? {
  [defaultUserId]: {
    id: defaultUserId,
    email: 'you@example.com',
    fullName: 'Shadi',
    passwordHash: hashPassword('password123'),
    onboardingCompleted: false,
    targetRole: 'HR Coordinator',
    location: 'Mississauga, ON',
    summary: 'Internationally experienced professional building a stable HR path in Canada.',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    authProvider: 'local'
  }
} : {};
const defaultUserData = shouldSeedDemoUser ? {
  [defaultUserId]: createUserData()
} : {};
const defaultState = {
  users: defaultUsers,
  sessions: {},
  userData: defaultUserData
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDbFile() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultState, null, 2));
  }
}

function normalizeState(raw) {
  const merged = { ...deepClone(defaultState), ...(raw || {}) };
  merged.users = merged.users || {};
  merged.sessions = merged.sessions || {};
  merged.userData = merged.userData || {};

  const legacyUser = raw?.user;
  if (legacyUser && !merged.users[legacyUser.id || defaultUserId]) {
    const legacyId = legacyUser.id || defaultUserId;
    merged.users[legacyId] = {
      id: legacyId,
      email: legacyUser.email || 'you@example.com',
      fullName: legacyUser.fullName || 'User',
      passwordHash: hashPassword('password123'),
      onboardingCompleted: Boolean(legacyUser.onboardingCompleted),
      targetRole: legacyUser.targetRole || '',
      location: legacyUser.location || '',
      summary: legacyUser.summary || '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      authProvider: 'local'
    };
    merged.userData[legacyId] = {
      onboarding: raw.onboarding || {},
      applications: raw.applications || [],
      resources: raw.resources || createUserData().resources,
      resumes: raw.resumes || [],
      resumeVersions: raw.resumeVersions || [],
      interviewSessions: raw.interviewSessions || [],
      liveSessions: raw.liveSessions || {},
      careerPath: raw.careerPath || null
    };
  }

  for (const userId of Object.keys(merged.users)) {
    merged.userData[userId] = { ...createUserData(), ...(merged.userData[userId] || {}) };
  }

  return merged;
}

function loadLocalState() {
  try {
    ensureDbFile();
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return normalizeState(JSON.parse(raw || '{}'));
  } catch {
    return deepClone(defaultState);
  }
}

const state = loadLocalState();
const dirtyUsers = new Set();
let flushPromise = null;
let flushTimer = null;
let schemaReadyPromise = null;

async function initPersistence() {
  if (!DB_ENABLED()) {
    if (isProduction && !allowLocalFallback) {
      throw new Error('Persistent database is required in production when local fallback is disabled.');
    }
    return { mode: 'local-json-fallback', ok: true };
  }
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      try {
        await query(`
        create extension if not exists pgcrypto;
        create table if not exists jobnova_users (
          id text primary key,
          email text not null unique,
          full_name text not null,
          password_hash text,
          onboarding_completed boolean not null default false,
          target_role text not null default '',
          location text not null default '',
          summary text not null default '',
          auth_provider text not null default 'local',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
        create table if not exists jobnova_sessions (
          token text primary key,
          user_id text not null references jobnova_users(id) on delete cascade,
          created_at timestamptz not null default now(),
          expires_at timestamptz
        );
        create table if not exists jobnova_user_state (
          user_id text primary key references jobnova_users(id) on delete cascade,
          payload jsonb not null default '{}'::jsonb,
          updated_at timestamptz not null default now()
        );
        create index if not exists idx_jobnova_sessions_user_id on jobnova_sessions(user_id);
      `);
        return true;
      } catch (error) {
        disablePostgres(error?.message || 'persistence initialization failed');
        schemaReadyPromise = null;
        if (isProduction && !allowLocalFallback) throw error;
        return false;
      }
    })();
  }
  const ready = await schemaReadyPromise;
  if (!ready) return { mode: 'local-json-fallback', ok: false };
  return { mode: 'postgres', ok: true };
}

function scheduleFlush() {
  if (!DB_ENABLED()) {
    if (isProduction && !allowLocalFallback) {
      return Promise.reject(new Error('Local JSON persistence is disabled in production.'));
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
    return Promise.resolve({ ok: true, mode: 'local-json-fallback' });
  }
  if (!flushPromise) {
    flushPromise = new Promise((resolve) => {
      flushTimer = setTimeout(async () => {
        const userIds = Array.from(dirtyUsers);
        dirtyUsers.clear();
        flushPromise = null;
        flushTimer = null;
        if (!userIds.length) return resolve({ ok: true, mode: 'postgres', skipped: true });
        try {
          await initPersistence();
          for (const userId of userIds) {
            const user = state.users[userId];
            const userData = state.userData[userId] || createUserData();
            if (!user) continue;
            await query(
              `insert into jobnova_users (id, email, full_name, password_hash, onboarding_completed, target_role, location, summary, auth_provider, created_at, updated_at)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               on conflict (id) do update set
                 email = excluded.email,
                 full_name = excluded.full_name,
                 password_hash = excluded.password_hash,
                 onboarding_completed = excluded.onboarding_completed,
                 target_role = excluded.target_role,
                 location = excluded.location,
                 summary = excluded.summary,
                 auth_provider = excluded.auth_provider,
                 updated_at = excluded.updated_at`,
              [
                user.id,
                user.email,
                user.fullName || 'User',
                user.passwordHash || null,
                Boolean(user.onboardingCompleted),
                user.targetRole || '',
                user.location || '',
                user.summary || '',
                user.authProvider || 'local',
                user.createdAt || nowIso(),
                nowIso()
              ]
            );
            await query(
              `insert into jobnova_user_state (user_id, payload, updated_at)
               values ($1,$2::jsonb,$3)
               on conflict (user_id) do update set payload = excluded.payload, updated_at = excluded.updated_at`,
              [userId, JSON.stringify(userData), nowIso()]
            );
          }
          resolve({ ok: true, mode: 'postgres', users: userIds.length });
        } catch (error) {
          if (allowLocalFallback) {
            try { fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2)); } catch {}
          }
          resolve({ ok: false, mode: allowLocalFallback ? 'local-json-fallback' : 'postgres', error: error.message });
        }
      }, 10);
    });
  }
  return flushPromise;
}

async function loadUserByIdFromDb(userId) {
  if (!DB_ENABLED() || !userId) return null;
  await initPersistence();
  const result = await query('select * from jobnova_users where id = $1 limit 1', [userId]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    onboardingCompleted: Boolean(row.onboarding_completed),
    targetRole: row.target_role || '',
    location: row.location || '',
    summary: row.summary || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : nowIso(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : nowIso(),
    authProvider: row.auth_provider || 'local'
  };
}

async function loadUserDataFromDb(userId) {
  if (!DB_ENABLED() || !userId) return null;
  await initPersistence();
  const result = await query('select payload from jobnova_user_state where user_id = $1 limit 1', [userId]);
  const row = result.rows[0];
  return { ...createUserData(), ...((row && row.payload) || {}) };
}

async function preloadUser(userId) {
  if (!userId) return { user: null, userData: createUserData() };
  if (state.users[userId] && state.userData[userId]) {
    return { user: state.users[userId], userData: state.userData[userId] };
  }
  if (DB_ENABLED()) {
    try {
      const [user, userData] = await Promise.all([loadUserByIdFromDb(userId), loadUserDataFromDb(userId)]);
      if (user) state.users[userId] = user;
      state.userData[userId] = userData || createUserData();
      return { user: user || null, userData: state.userData[userId] };
    } catch {
      disablePostgres('preloadUser fallback');
    }
  }
  state.userData[userId] = state.userData[userId] || createUserData();
  return { user: state.users[userId] || null, userData: state.userData[userId] };
}

async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  const fromCache = Object.values(state.users).find((user) => user.email === normalized) || null;
  if (fromCache) return fromCache;
  if (!DB_ENABLED()) return null;
  try {
    await initPersistence();
    const result = await query('select * from jobnova_users where email = $1 limit 1', [normalized]);
    const row = result.rows[0];
    if (!row) return null;
    const user = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    passwordHash: row.password_hash,
    onboardingCompleted: Boolean(row.onboarding_completed),
    targetRole: row.target_role || '',
    location: row.location || '',
    summary: row.summary || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : nowIso(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : nowIso(),
    authProvider: row.auth_provider || 'local'
  };
    state.users[user.id] = user;
    return user;
  } catch {
    disablePostgres('findUserByEmail fallback');
    return null;
  }
}

async function createUser({ email, fullName, password, id, authProvider = 'local' }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }
  const userId = id || `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  state.users[userId] = {
    id: userId,
    email: normalizedEmail,
    fullName: String(fullName || '').trim() || 'User',
    passwordHash: password ? hashPassword(password) : null,
    onboardingCompleted: false,
    targetRole: '',
    location: '',
    summary: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    authProvider
  };
  state.userData[userId] = createUserData();
  dirtyUsers.add(userId);
  await scheduleFlush();
  return state.users[userId];
}

function updateUser(userId, patch) {
  state.users[userId] = {
    ...state.users[userId],
    ...(patch || {}),
    updatedAt: nowIso()
  };
  dirtyUsers.add(userId);
  void scheduleFlush();
  return state.users[userId];
}

async function issueSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  state.sessions[token] = { userId, createdAt: nowIso() };
  if (DB_ENABLED()) {
    try {
      await initPersistence();
      await query(
        'insert into jobnova_sessions (token, user_id, created_at) values ($1,$2,$3) on conflict (token) do update set user_id = excluded.user_id, created_at = excluded.created_at',
        [token, userId, nowIso()]
      );
    } catch {
      disablePostgres('issueSession fallback');
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
    }
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  }
  return token;
}

async function revokeSession(token) {
  if (token && state.sessions[token]) delete state.sessions[token];
  if (DB_ENABLED() && token) {
    try {
      await initPersistence();
      await query('delete from jobnova_sessions where token = $1', [token]);
    } catch {
      disablePostgres('revokeSession fallback');
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
    }
  } else if (!DB_ENABLED()) {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  }
}

async function getUserByToken(token) {
  const session = token ? state.sessions[token] : null;
  if (session) {
    await preloadUser(session.userId);
    return state.users[session.userId] || null;
  }
  if (!DB_ENABLED() || !token) return null;
  try {
    await initPersistence();
    const sessionResult = await query('select user_id from jobnova_sessions where token = $1 limit 1', [token]);
    const userId = sessionResult.rows[0]?.user_id;
    if (!userId) return null;
    state.sessions[token] = { userId, createdAt: nowIso() };
    const { user } = await preloadUser(userId);
    return user || null;
  } catch {
    disablePostgres('getUserByToken fallback');
    return null;
  }
}

function ensureUserData(userId) {
  if (!state.userData[userId]) {
    state.userData[userId] = createUserData();
    if (userId && state.users[userId]) dirtyUsers.add(userId);
    void scheduleFlush();
  }
  return state.userData[userId];
}

function saveState() {
  return scheduleFlush();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    onboardingCompleted: Boolean(user.onboardingCompleted),
    targetRole: user.targetRole || '',
    location: user.location || '',
    summary: user.summary || '',
    authProvider: user.authProvider || 'local'
  };
}

async function attachExternalUser({ id, email, fullName, authProvider = 'supabase' }) {
  if (!id || !email) return null;
  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.id !== id || existing.authProvider !== authProvider) {
      state.users[existing.id] = { ...existing, authProvider, updatedAt: nowIso() };
      dirtyUsers.add(existing.id);
      await scheduleFlush();
    }
    return state.users[existing.id];
  }
  const { user } = await preloadUser(id);
  if (user) return user;
  return createUser({ id, email, fullName, password: null, authProvider });
}

module.exports = {
  state,
  saveState,
  DB_FILE,
  createUser,
  updateUser,
  findUserByEmail,
  verifyPassword,
  issueSession,
  revokeSession,
  getUserByToken,
  ensureUserData,
  publicUser,
  preloadUser,
  initPersistence,
  attachExternalUser,
  createUserData
};
