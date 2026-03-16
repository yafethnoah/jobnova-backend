
const { listJobs, markRunning, markDone, markFailed } = require('../lib/jobQueue');
const { log } = require('../lib/telemetry');

async function drainInterviewJobs() {
  const jobs = listJobs().filter((job) => job.type === 'interview-feedback' && job.status === 'queued');
  for (const job of jobs) {
    try {
      markRunning(job);
      await new Promise((resolve) => setTimeout(resolve, 10));
      markDone(job, { message: 'Interview scoring placeholder completed.' });
    } catch (error) {
      markFailed(job, error);
      log('error', 'interview_worker_failed', { jobId: job.id, message: error.message });
    }
  }
}

module.exports = { drainInterviewJobs };
