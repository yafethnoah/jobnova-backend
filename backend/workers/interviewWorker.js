const { listJobs, markRunning, markDone, markFailed } = require('../lib/jobQueue');
const { log } = require('../lib/telemetry');
const { processJob } = require('../services/jobProcessor');

async function drainInterviewJobs() {
  const jobs = listJobs().filter((job) => job.kind === 'interview-score' && job.status === 'queued');
  for (const job of jobs) {
    try {
      markRunning(job);
      const result = await processJob('interview-score', job.payload || {});
      markDone(job, result);
    } catch (error) {
      markFailed(job, error);
      log('error', 'interview_worker_failed', { jobId: job.id, message: error.message });
    }
  }
}

module.exports = { drainInterviewJobs };
