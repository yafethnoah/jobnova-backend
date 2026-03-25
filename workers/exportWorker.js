const { listJobs, markRunning, markDone, markFailed } = require('../lib/jobQueue');
const { log } = require('../lib/telemetry');
const { processJob } = require('../services/jobProcessor');

async function drainExportJobs() {
  const jobs = listJobs().filter((job) => job.kind === 'resume-export' && job.status === 'queued');
  for (const job of jobs) {
    try {
      markRunning(job);
      const result = await processJob('resume-export', job.payload || {});
      markDone(job, result);
    } catch (error) {
      markFailed(job, error);
      log('error', 'export_worker_failed', { jobId: job.id, message: error.message });
    }
  }
}

module.exports = { drainExportJobs };
