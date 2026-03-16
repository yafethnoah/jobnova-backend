const { Queue, Worker } = require('bullmq');
const { randomUUID } = require('crypto');
const { getRedis } = require('./redis');
const { log } = require('./telemetry');
const { processJob } = require('../services/jobProcessor');

const memoryJobs = [];
let queue = null;
let worker = null;

function queueWorkerEnabled() {
  return process.env.ENABLE_QUEUE_WORKER === 'true';
}

function getQueue() {
  if (!queueWorkerEnabled()) return null;
  const connection = getRedis();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue('jobnova-v75', { connection });
  }
  return queue;
}

function startWorker(onEvent) {
  if (!queueWorkerEnabled()) return null;
  const connection = getRedis();
  if (!connection || worker) return worker;
  worker = new Worker(
    'jobnova-v75',
    async (job) => {
      const result = await processJob(job.name, job.data?.payload || {});
      onEvent?.({
        jobId: job.data?.appJobId || job.id,
        status: 'completed',
        progress: 100,
        result,
        queueJobId: job.id
      });
      return result;
    },
    { connection }
  );

  worker.on('active', (job) => {
    onEvent?.({
      jobId: job.data?.appJobId || job.id,
      status: 'processing',
      progress: 20,
      queueJobId: job.id
    });
  });

  worker.on('failed', (job, error) => {
    onEvent?.({
      jobId: job?.data?.appJobId || job?.id,
      status: 'failed',
      progress: 100,
      errorMessage: error?.message || 'Queue job failed.',
      queueJobId: job?.id
    });
  });

  worker.on('error', (error) => {
    log('error', 'bullmq_worker_error', { message: error.message });
  });

  return worker;
}

async function enqueue(kind, payload = {}, onLocalUpdate) {
  const job = {
    id: randomUUID(),
    kind,
    status: 'queued',
    progress: 0,
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memoryJobs.unshift(job);

  const queueInstance = getQueue();
  if (queueInstance) {
    const queued = await queueInstance.add(kind, { appJobId: job.id, payload }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1500 },
      removeOnComplete: 100,
      removeOnFail: 100
    });
    job.queueJobId = queued.id;
    return job;
  }

  setTimeout(async () => {
    try {
      job.status = 'processing';
      job.progress = 20;
      job.updatedAt = new Date().toISOString();
      onLocalUpdate?.({ ...job });

      const result = await processJob(kind, payload);

      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date().toISOString();
      onLocalUpdate?.({ ...job });
    } catch (error) {
      job.status = 'failed';
      job.progress = 100;
      job.errorMessage = error?.message || 'Queue job failed.';
      job.updatedAt = new Date().toISOString();
      onLocalUpdate?.({ ...job });
    }
  }, 25);

  return job;
}

function listJobs(limit = 100) {
  return memoryJobs.slice(0, limit);
}

module.exports = { enqueue, listJobs, startWorker, getQueue };
