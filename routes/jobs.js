const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { parse, compareSchema, rewriteSchema, exportSchema, realtimeSessionSchema } = require('../lib/validation');
const { enqueue, listJobs, startWorker } = require('../lib/jobQueue');
const jobsRepository = require('../repositories/jobsRepository');
const packagesRepository = require('../repositories/applicationPackagesRepository');

const router = express.Router();
router.use(requireAuth);

startWorker(async (event) => {
  // worker events are reconciled per request later through GET; persistent updates happen via queue ID path when API polls.
  // In starter mode, the in-memory fallback uses the local callback below instead.
});

async function persistAutopilotPackageIfNeeded(req, job) {
  if (!job || job.kind !== 'application-package' || job.status !== 'completed' || !job.result) return null;
  const existing = await packagesRepository.findBySourceJobId(req, job.id);
  if (existing) return existing;
  return packagesRepository.createPackage(req, {
    sourceJobId: job.id,
    targetRole: job.payload?.targetRole || '',
    companyName: job.payload?.companyName || '',
    status: 'draft',
    package: job.result,
    linkedResumeVersionId: job.result?.tailoredResume?.id || null
  });
}

async function createBackgroundJob(req, kind, payload) {
  const job = await enqueue(kind, payload, async (localJob) => {
    await jobsRepository.updateJob(req, localJob.id, {
      status: localJob.status,
      progress: localJob.progress,
      result: localJob.result,
      errorMessage: localJob.errorMessage,
      queueJobId: localJob.queueJobId
    });
  });

  const record = {
    id: job.id,
    kind,
    status: job.status,
    progress: job.progress,
    payload,
    queueJobId: job.queueJobId || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
  await jobsRepository.createJob(req, record);
  return record;
}

router.post('/ats/compare', async (req, res, next) => {
  try {
    const payload = parse(compareSchema, req.body);
    const job = await createBackgroundJob(req, 'ats-compare', payload);
    res.status(202).json(job);
  } catch (error) {
    next(error);
  }
});

router.post('/resume/rewrite', async (req, res, next) => {
  try {
    const payload = parse(rewriteSchema, req.body);
    const job = await createBackgroundJob(req, 'resume-rewrite', payload);
    res.status(202).json(job);
  } catch (error) {
    next(error);
  }
});

router.post('/autopilot/package', async (req, res, next) => {
  try {
    const payload = parse(rewriteSchema, req.body);
    const job = await createBackgroundJob(req, 'application-package', payload);
    res.status(202).json(job);
  } catch (error) {
    next(error);
  }
});

router.post('/export/resume', async (req, res, next) => {
  try {
    const payload = parse(exportSchema, req.body);
    const job = await createBackgroundJob(req, 'resume-export', payload);
    res.status(202).json(job);
  } catch (error) {
    next(error);
  }
});

router.post('/interview/score', async (req, res, next) => {
  try {
    const payload = parse(realtimeSessionSchema, req.body);
    const job = await createBackgroundJob(req, 'interview-score', payload);
    res.status(202).json(job);
  } catch (error) {
    next(error);
  }
});


router.get('/autopilot/packages', async (req, res, next) => {
  try {
    const items = await packagesRepository.listPackages(req);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post('/autopilot/packages/from-job/:jobId', async (req, res, next) => {
  try {
    const job = await jobsRepository.getJob(req, req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (job.kind !== 'application-package') return res.status(400).json({ message: 'Job is not an application package job.' });
    if (job.status !== 'completed') return res.status(409).json({ message: 'Job has not completed yet.', status: job.status });
    const record = await persistAutopilotPackageIfNeeded(req, job);
    res.json(record);
  } catch (error) {
    next(error);
  }
});

router.get('/autopilot/packages/:packageId', async (req, res, next) => {
  try {
    const item = await packagesRepository.getPackage(req, req.params.packageId);
    if (!item) return res.status(404).json({ message: 'Application package not found.' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.post('/autopilot/packages/:packageId/approve', async (req, res, next) => {
  try {
    const current = await packagesRepository.getPackage(req, req.params.packageId);
    if (!current) return res.status(404).json({ message: 'Application package not found.' });
    const item = await packagesRepository.updatePackage(req, req.params.packageId, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.post('/autopilot/packages/:packageId/retry-export', async (req, res, next) => {
  try {
    const current = await packagesRepository.getPackage(req, req.params.packageId);
    if (!current) return res.status(404).json({ message: 'Application package not found.' });
    const exportJob = await createBackgroundJob(req, 'resume-export', {
      targetRole: current.targetRole,
      companyName: current.companyName,
      amendedResume: current.package?.tailoredResume?.rewrittenResume || '',
      coverLetter: current.package?.coverLetter || '',
      recruiterEmail: current.package?.recruiterEmail || '',
      selectedExportFormat: 'both',
      resumeThemeId: 'classic-canadian-professional',
      layoutMode: 'two-page'
    });
    const updated = await packagesRepository.updatePackage(req, req.params.packageId, {
      linkedExportJobId: exportJob.id
    });
    res.status(202).json({ package: updated, exportJob });
  } catch (error) {
    next(error);
  }
});

router.get('/:jobId/status', async (req, res, next) => {
  try {
    const job = await jobsRepository.getJob(req, req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    res.json({
      id: job.id,
      kind: job.kind,
      status: job.status,
      progress: job.progress,
      errorMessage: job.errorMessage || null,
      updatedAt: job.updatedAt,
      queueJobId: job.queueJobId || null
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:jobId/result', async (req, res, next) => {
  try {
    const job = await jobsRepository.getJob(req, req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (job.status !== 'completed') {
      return res.status(409).json({ message: 'Job has not completed yet.', status: job.status, progress: job.progress });
    }
    const applicationPackage = await persistAutopilotPackageIfNeeded(req, job);
    res.json({ id: job.id, kind: job.kind, result: job.result, packageId: applicationPackage?.id || null });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const items = await jobsRepository.listJobsForUser(req);
    res.json({
      items,
      localQueueDepth: listJobs().filter((job) => job.status === 'queued' || job.status === 'processing').length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { jobsRouter: router };
