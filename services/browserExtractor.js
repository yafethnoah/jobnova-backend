const cheerio = require('cheerio');
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (_) {
  try {
    puppeteer = require('puppeteer-core');
  } catch (__){
    puppeteer = null;
  }
}

function cleanText(value = '') {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtml(html = '') {
  return cleanText(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<img[^>]*>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function detectPlatform(url = '') {
  const s = String(url).toLowerCase();
  if (s.includes('linkedin.com')) return 'linkedin';
  if (s.includes('greenhouse.io')) return 'greenhouse';
  if (s.includes('lever.co')) return 'lever';
  if (s.includes('myworkdayjobs.com') || s.includes('/workday/')) return 'workday';
  if (s.includes('indeed.com')) return 'indeed';
  return 'generic';
}

function looksBlocked(text = '') {
  return /captcha|access denied|sign in to continue|unusual traffic|enable javascript|forbidden|cloudflare|robot check|page not found|nothing was found at this location|404/i.test(
    String(text || '')
  );
}

function looksContactHeavy(text = '') {
  const value = cleanText(text).toLowerCase();
  const emailHits = (value.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || []).length;
  const phoneHits = (value.match(/(?:\+?\d[\d(). -]{7,}\d)/g) || []).length;
  const applicationFormHits = (value.match(/first name|last name|upload your resume|upload your cover letter|how did you hear about us|consent|choose file|phone number|email address/g) || []).length;
  const jobHits = (value.match(/responsibilit|requirement|qualification|skills|experience|duties|about the role|position summary|what you'll do|what you will do|about you/g) || []).length;
  return (emailHits + phoneHits >= 5 && jobHits < 2) || (applicationFormHits >= 4 && jobHits < 2);
}

function isLikelyUseful(text = '') {
  const value = cleanText(text).toLowerCase();
  if (!value || value.length < 250) return false;

  let score = 0;
  const positivePatterns = [
    /responsibilit/,
    /requirement/,
    /qualification/,
    /experience/,
    /skills?/,
    /benefits?/,
    /about the role/,
    /about this role/,
    /what you'll do/,
    /what you will do/,
    /position summary/,
    /employment type/,
    /full[- ]time/,
    /part[- ]time/,
    /contract/,
    /salary/,
    /hours/,
    /remote/,
    /candidate/,
    /role/,
    /duties/,
    /job description/
  ];

  for (const rx of positivePatterns) {
    if (rx.test(value)) score += 1;
  }

  if ((value.match(/\n/g) || []).length >= 8) score += 1;
  if (value.length >= 1200) score += 1;

  const negativePatterns = [
    /privacy policy/,
    /terms of use/,
    /cookie policy/,
    /newsletter/,
    /all rights reserved/,
    /contact us/,
    /follow us/,
    /how did you hear about us/,
    /first name/,
    /last name/,
    /phone number/,
    /email address/,
    /upload your resume/,
    /upload your cover letter/,
    /general application form/,
    /volunteer with us/,
    /nothing was found at this location/,
    /page not found/,
    /404/
  ];

  for (const rx of negativePatterns) {
    if (rx.test(value)) score -= 2;
  }

  if (looksBlocked(value)) score -= 3;
  if (looksContactHeavy(value)) score -= 4;

  return score >= 4;
}

function getFallbackSelectors(platform = 'generic') {
  const common = [
    '[data-testid*="jobDescription"]',
    '[data-testid*="description"]',
    '[itemprop="description"]',
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="description"]',
    '[class*="entry-content"]',
    '[class*="content"]',
    '[class*="post-content"]',
    '[role="main"]',
    'main',
    'article',
    'body'
  ];

  const platformSelectors = {
    linkedin: [
      '.show-more-less-html__markup',
      '.description__text',
      '.jobs-description__container',
      '.jobs-box__html-content',
      'main'
    ],
    greenhouse: ['#content', '.content', '#app-body', '#main', '.opening', 'main', 'article'],
    lever: ['.section-wrapper.page-full-width', '.posting-page', '.posting', '.content', 'main', 'article'],
    workday: [
      '[data-automation-id="jobPostingDescription"]',
      '[data-automation-id="externalPosting"]',
      '[data-automation-id="jobPostingDescriptionSection"]',
      'main',
      'article'
    ],
    indeed: ['#jobDescriptionText', '[data-testid="jobsearch-JobComponent-description"]', '[data-testid*="jobDetails"]', 'main', 'article'],
    generic: common
  };

  return platformSelectors[platform] || common;
}

function extractFromHtml(html = '', url = '') {
  const platform = detectPlatform(url);
  const $ = cheerio.load(html);
  const selectors = getFallbackSelectors(platform);
  let bestText = '';
  let bestScore = -999;

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const text = cleanText($(el).text() || '');
      if (!text) return;

      let score = Math.min(text.length / 20, 120);
      if (/responsibilit|requirement|qualification|skills|experience/i.test(text)) score += 40;
      if (/salary|benefits|full[- ]time|contract|remote|hours/i.test(text)) score += 20;
      if ((text.match(/\n/g) || []).length >= 8) score += 10;
      if (/privacy policy|newsletter|contact us|upload your resume/i.test(text)) score -= 120;
      if (looksContactHeavy(text)) score -= 180;
      if (text.length < 250) score -= 40;

      if (score > bestScore) {
        bestScore = score;
        bestText = text;
      }
    });
  }

  if (bestText && !looksContactHeavy(bestText)) {
    return {
      title: cleanText($('title').first().text() || ''),
      text: bestText
    };
  }

  return {
    title: cleanText($('title').first().text() || ''),
    text: looksContactHeavy(cleanText(stripHtml(html))) ? '' : cleanText(stripHtml(html))
  };
}

async function fetchStatic(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 JobNovaBot/1.2',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: url
    },
    redirect: 'follow'
  });

  const html = String(await response.text() || '');
  const extracted = extractFromHtml(html, url);

  return {
    html,
    title: extracted.title,
    text: extracted.text,
    finalUrl: response.url || url,
    source: 'static-fetch',
    status: response.status
  };
}

async function extractWithPuppeteer(url) {
  if (!puppeteer) {
    throw new Error('Puppeteer is not installed');
  }

  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 JobNovaBot/1.2'
    );
    await page.setViewport({ width: 1440, height: 2200 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const html = await page.content();
    const pageTitle = cleanText(await page.title().catch(() => ''));
    const extracted = extractFromHtml(html, page.url());

    return {
      html,
      title: extracted.title || pageTitle,
      text: extracted.text,
      finalUrl: page.url() || url,
      source: 'browser-rendered',
      status: 200
    };
  } finally {
    await browser.close().catch(() => null);
  }
}

async function extractWithBrowser(url) {
  try {
    const browserResult = await extractWithPuppeteer(url);
    if (browserResult?.text && isLikelyUseful(browserResult.text)) {
      return browserResult;
    }
  } catch (_) {}

  return fetchStatic(url);
}

async function extractJobDescription(url) {
  const result = await extractWithBrowser(url);
  return result?.text || '';
}

module.exports = {
  extractWithBrowser,
  extractJobDescription,
  isLikelyUseful,
  cleanText,
  stripHtml,
  detectPlatform
};
