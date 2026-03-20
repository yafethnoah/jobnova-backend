const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'db.json');

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
const defaultState = {
  users: {
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
      updatedAt: nowIso()
    }
  },
  sessions: {},
  userData: {
    [defaultUserId]: createUserData()
  }
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
      updatedAt: nowIso()
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

function loadState() {
  try {
    ensureDbFile();
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return normalizeState(JSON.parse(raw || '{}'));
  } catch {
    return deepClone(defaultState);
  }
}

const state = loadState();

function saveState() {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

function createUser({ email, fullName, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }
  const id = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  state.users[id] = {
    id,
    email: normalizedEmail,
    fullName: String(fullName || '').trim() || 'User',
    passwordHash: hashPassword(password || ''),
    onboardingCompleted: false,
    targetRole: '',
    location: '',
    summary: '',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.userData[id] = createUserData();
  saveState();
  return state.users[id];
}

function updateUser(userId, patch) {
  state.users[userId] = {
    ...state.users[userId],
    ...(patch || {}),
    updatedAt: nowIso()
  };
  saveState();
  return state.users[userId];
}

function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return Object.values(state.users).find((user) => user.email === normalized) || null;
}

function issueSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  state.sessions[token] = { userId, createdAt: nowIso() };
  saveState();
  return token;
}

function revokeSession(token) {
  if (token && state.sessions[token]) {
    delete state.sessions[token];
    saveState();
  }
}

function getUserByToken(token) {
  const session = token ? state.sessions[token] : null;
  if (!session) return null;
  return state.users[session.userId] || null;
}

function ensureUserData(userId) {
  if (!state.userData[userId]) {
    state.userData[userId] = createUserData();
    saveState();
  }
  return state.userData[userId];
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
    summary: user.summary || ''
  };
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
  publicUser
};
