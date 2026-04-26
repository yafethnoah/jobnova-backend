const { getSupabaseAdmin } = require('./supabase');

async function safeUpsert(table, rows, onConflict) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { synced: false };
  try {
    let query = supabase.from(table).upsert(rows, onConflict ? { onConflict } : undefined);
    const { error } = await query;
    if (error) return { synced: false, error: error.message };
    return { synced: true };
  } catch (error) {
    return { synced: false, error: error.message };
  }
}

async function appendCloudEvent(userId, eventType, payload) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !userId || !eventType) return { synced: false };
  try {
    const { error } = await supabase.from('jobnova_events').insert({
      user_id: userId,
      event_type: eventType,
      payload,
      created_at: new Date().toISOString()
    });
    if (error) return { synced: false, error: error.message };
    return { synced: true };
  } catch (error) {
    return { synced: false, error: error.message };
  }
}

async function upsertCloudRecord(collection, userId, payload, recordId = 'latest') {
  const row = {
    collection,
    user_id: userId,
    record_id: recordId,
    payload,
    updated_at: new Date().toISOString()
  };
  return safeUpsert('jobnova_records', row, 'collection,user_id,record_id');
}

async function upsertCloudSnapshot(userId, snapshot) {
  const row = {
    user_id: userId,
    snapshot,
    updated_at: new Date().toISOString()
  };
  return safeUpsert('jobnova_snapshots', row, 'user_id');
}

function summarizeUserData(user, userData) {
  const applications = userData?.applications || [];
  const interviewSessions = userData?.interviewSessions || [];
  const resumes = userData?.resumes || [];
  const resumeVersions = userData?.resumeVersions || [];
  const exportLibrary = userData?.exportLibrary || [];
  return {
    user: {
      id: user?.id,
      email: user?.email,
      fullName: user?.fullName,
      targetRole: user?.targetRole || '',
      location: user?.location || '',
      onboardingCompleted: Boolean(user?.onboardingCompleted)
    },
    metrics: {
      applications: applications.length,
      interviews: interviewSessions.length,
      uploadedResumes: resumes.length,
      resumeVersions: resumeVersions.length,
      exports: exportLibrary.length
    },
    latest: {
      application: applications[0] || null,
      interviewSession: interviewSessions[0] || null,
      resume: resumes[0] || null,
      resumeVersion: resumeVersions[0] || null,
      careerPath: userData?.careerPath || null
    }
  };
}

async function syncUserState(user, userData, eventType, payload, recordId = 'latest') {
  if (!user?.id) return { synced: false };
  const results = await Promise.all([
    upsertCloudRecord(eventType, user.id, payload, recordId),
    upsertCloudSnapshot(user.id, summarizeUserData(user, userData)),
    appendCloudEvent(user.id, eventType, payload)
  ]);
  return {
    synced: results.some((item) => item.synced),
    details: results
  };
}

function enqueueUserSync(user, userData, eventType, payload, recordId = 'latest') {
  if (!user?.id) return;
  setImmediate(() => {
    syncUserState(user, userData, eventType, payload, recordId).catch(() => undefined);
  });
}

module.exports = { upsertCloudRecord, upsertCloudSnapshot, appendCloudEvent, syncUserState, enqueueUserSync, summarizeUserData };
