
const { listJobs, markRunning, markDone, markFailed } = require('../lib/jobQueue');
const { log } = require('../lib/telemetry');

async function drainExportJobs() {
  const jobs = listJobs().filter((job) => job.type === 'export' && job.status === 'queued');
  for (const job of jobs) {
    try {
      markRunning(job);
      // placeholder for a real queue worker
      await new Promise((resolve) => setTimeout(resolve, 10));
      markDone(job, { message: 'Export job placeholder completed.' });
    } catch (error) {
      markFailed(job, error);
      log('error', 'export_worker_failed', { jobId: job.id, message: error.message });
    }
  }
}

module.exports = { drainExportJobs };
