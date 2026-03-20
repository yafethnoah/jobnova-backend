const { browserExtractionEnabled, env } = require('../config/env');
const { withRetry } = require('../lib/retry');

function isLikelyUseful(text = '') {
  const value = String(text || '').trim();
  return value.length >= 500 && !/access denied|captcha|enable javascript|sign in to continue|cloudflare/i.test(value);
}

async function extractWithBrowser(url) {
  if (!browserExtractionEnabled) return null;
  const puppeteer = require('puppeteer');
  return withRetry(async () => {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 JobNovaBot/13.0');
      await page.setExtraHTTPHeaders({ 'Accept-Language': env.JOB_EXTRACTION_LOCALE || 'en-US,en;q=0.9' });
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForTimeout?.(500);
      const payload = await page.evaluate(() => ({
        title: document.title || '',
        html: document.documentElement?.outerHTML || '',
        text: document.body?.innerText || ''
      }));
      return {
        ok: Boolean(response),
        status: response?.status?.() || 200,
        finalUrl: page.url(),
        html: payload.html || '',
        text: payload.text || '',
        title: payload.title || '',
        source: isLikelyUseful(payload.text) ? 'browser-rendered' : 'browser-partial'
      };
    } finally {
      await browser.close();
    }
  }, { retries: 1, baseDelayMs: 1200 });
}

module.exports = { extractWithBrowser, isLikelyUseful };
