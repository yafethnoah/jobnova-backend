const { randomUUID } = require("crypto");
const { getPool, query } = require("../lib/db");

function fallback(req) {
  req.userData.autopilotPackages = req.userData.autopilotPackages || [];
  return req.userData.autopilotPackages;
}

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    sourceJobId: row.source_job_id || row.sourceJobId || null,
    targetRole: row.target_role || row.targetRole || '',
    companyName: row.company_name || row.companyName || '',
    status: row.status || 'draft',
    package: row.package_json || row.package || {},
    approvedAt: row.approved_at || row.approvedAt || null,
    linkedResumeVersionId: row.linked_resume_version_id || row.linkedResumeVersionId || null,
    linkedExportJobId: row.linked_export_job_id || row.linkedExportJobId || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

async function createPackage(req, input) {
  const record = {
    id: input.id || `pkg-${randomUUID()}`,
    sourceJobId: input.sourceJobId || null,
    targetRole: input.targetRole || '',
    companyName: input.companyName || '',
    status: input.status || 'draft',
    package: input.package || {},
    approvedAt: input.approvedAt || null,
    linkedResumeVersionId: input.linkedResumeVersionId || null,
    linkedExportJobId: input.linkedExportJobId || null,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString()
  };

  const pg = getPool();
  if (!pg) {
    const items = fallback(req);
    items.unshift(record);
    return record;
  }

  await query(
    `insert into application_packages
      (id, user_id, source_job_id, target_role, company_name, status, package_json, approved_at, linked_resume_version_id, linked_export_job_id, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())`,
    [
      record.id,
      req.user.id,
      record.sourceJobId,
      record.targetRole,
      record.companyName,
      record.status,
      JSON.stringify(record.package || {}),
      record.approvedAt,
      record.linkedResumeVersionId,
      record.linkedExportJobId
    ]
  );
  return record;
}

async function updatePackage(req, packageId, patch) {
  const pg = getPool();
  if (!pg) {
    const items = fallback(req);
    const current = items.find((item) => item.id === packageId);
    if (!current) return null;
    Object.assign(current, patch, { updatedAt: new Date().toISOString() });
    return current;
  }
  const current = await getPackage(req, packageId);
  if (!current) return null;
  const next = { ...current, ...patch };
  await query(
    `update application_packages
        set status=$2,
            package_json=$3,
            approved_at=$4,
            linked_resume_version_id=$5,
            linked_export_job_id=$6,
            updated_at=now()
      where id=$1 and user_id=$7`,
    [
      packageId,
      next.status,
      JSON.stringify(next.package || {}),
      next.approvedAt,
      next.linkedResumeVersionId,
      next.linkedExportJobId,
      req.user.id
    ]
  );
  return next;
}

async function getPackage(req, packageId) {
  const pg = getPool();
  if (!pg) {
    return fallback(req).find((item) => item.id === packageId) || null;
  }
  const { rows } = await query(
    `select id, source_job_id, target_role, company_name, status, package_json, approved_at, linked_resume_version_id, linked_export_job_id, created_at, updated_at
       from application_packages
      where id=$1 and user_id=$2
      limit 1`,
    [packageId, req.user.id]
  );
  return normalize(rows[0]);
}

async function findBySourceJobId(req, sourceJobId) {
  const pg = getPool();
  if (!pg) {
    return fallback(req).find((item) => item.sourceJobId === sourceJobId) || null;
  }
  const { rows } = await query(
    `select id, source_job_id, target_role, company_name, status, package_json, approved_at, linked_resume_version_id, linked_export_job_id, created_at, updated_at
       from application_packages
      where source_job_id=$1 and user_id=$2
      order by created_at desc
      limit 1`,
    [sourceJobId, req.user.id]
  );
  return normalize(rows[0]);
}

async function listPackages(req, limit = 50) {
  const pg = getPool();
  if (!pg) {
    return fallback(req).slice(0, limit);
  }
  const { rows } = await query(
    `select id, source_job_id, target_role, company_name, status, package_json, approved_at, linked_resume_version_id, linked_export_job_id, created_at, updated_at
       from application_packages
      where user_id=$1
      order by created_at desc
      limit $2`,
    [req.user.id, limit]
  );
  return rows.map(normalize);
}

module.exports = { createPackage, updatePackage, getPackage, listPackages, findBySourceJobId };
