function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function withRetry(fn, options = {}) {
  const retries = Number(options.retries ?? 2);
  const baseDelayMs = Number(options.baseDelayMs ?? 500);
  const factor = Number(options.factor ?? 2);
  const shouldRetry = typeof options.shouldRetry === 'function'
    ? options.shouldRetry
    : (error) => /timeout|network|ECONNRESET|ECONNREFUSED|socket hang up|temporarily unavailable|429/i.test(String(error?.message || ''));

  let attempt = 0;
  while (true) {
    try {
      return await fn(attempt + 1);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) throw error;
      const delay = baseDelayMs * Math.pow(factor, attempt);
      await wait(delay);
      attempt += 1;
    }
  }
}

module.exports = { withRetry };
