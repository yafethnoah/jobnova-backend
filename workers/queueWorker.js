require('dotenv').config();
const { startWorker } = require('../lib/jobQueue');
const { initSentry } = require('../lib/sentry');
const { log } = require('../lib/telemetry');

initSentry();
startWorker((event) => log('info', 'queue_worker_event', event));
log('info', 'queue_worker_started', { pid: process.pid });
