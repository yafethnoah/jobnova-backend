const { query, getPool } = require('../lib/db');

function fallback(req) {
  req.userData.backgroundJobs = req.userData.backgroundJobs || [];
  return req.userData.backgroundJobs;
}

async function createJob(req, job) {
  const pg = getPool();
  if (!pg) {
    const jobs = fallback(req);
    jobs.unshift(job);
    return job;
  }

  await query(
    `insert into background_jobs
      (id, user_id, kind, status, progress, payload_json, result_json, error_message, request_id, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())`,
    [
      job.id,
      req.user.id,
      job.kind,
      job.status,
      job.progress || 0,
      JSON.stringify(job.payload || {}),
      job.result ? JSON.stringify(job.result) : null,
      job.errorMessage || null,
      req.requestId || null
    ]
  );
  return job;
}

async function updateJob(req, jobId, patch) {
  const pg = getPool();
  if (!pg) {
    const jobs = fallback(req);
    const current = jobs.find((item) => item.id === jobId);
    if (!current) return null;
    Object.assign(current, patch, { updatedAt: new Date().toISOString() });
    return current;
  }

  const current = await getJob(req, jobId);
  if (!current) return null;
  const next = { ...current, ...patch };
  await query(
    `update background_jobs
        set status=$2,
            progress=$3,
            result_json=$4,
            error_message=$5,
            queue_job_id=$6,
            updated_at=now()
      where id=$1 and user_id=$7`,
    [
      jobId,
      next.status,
      next.progress || 0,
      next.result ? JSON.stringify(next.result) : null,
      next.errorMessage || null,
      next.queueJobId || null,
      req.user.id
    ]
  );
  return next;
}

async function getJob(req, jobId) {
  const pg = getPool();
  if (!pg) {
    const jobs = fallback(req);
    return jobs.find((item) => item.id === jobId) || null;
  }

  const { rows } = await query(
    `select id, user_id, kind, status, progress, payload_json, result_json, error_message, queue_job_id, created_at, updated_at
       from background_jobs
      where id=$1 and user_id=$2
      limit 1`,
    [jobId, req.user.id]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    progress: row.progress,
    payload: row.payload_json || {},
    result: row.result_json || null,
    errorMessage: row.error_message || null,
    queueJobId: row.queue_job_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listJobsForUser(req, limit = 50) {
  const pg = getPool();
  if (!pg) {
    return fallback(req).slice(0, limit);
  }
  const { rows } = await query(
    `select id, kind, status, progress, payload_json, result_json, error_message, queue_job_id, created_at, updated_at
       from background_jobs
      where user_id=$1
      order by created_at desc
      limit $2`,
    [req.user.id, limit]
  );
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    progress: row.progress,
    payload: row.payload_json || {},
    result: row.result_json || null,
    errorMessage: row.error_message || null,
    queueJobId: row.queue_job_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

module.exports = { createJob, updateJob, getJob, listJobsForUser };
