const cheerio = require('cheerio');

function cleanText(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function stripHtml(html = '') {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<img[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function detectPlatform(url = '') {
  const s = String(url).toLowerCase();
  if (s.includes('linkedin.com')) return 'linkedin';
  if (s.includes('greenhouse.io')) return 'greenhouse';
  if (s.includes('lever.co')) return 'lever';
  if (s.includes('myworkdayjobs.com') || s.includes('/workday/')) return 'workday';
  return 'generic';
}

function extractJsonLd($) {
  const blocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      blocks.push(parsed);
    } catch {
      // ignore malformed JSON-LD
    }
  });
  return blocks;
}

function flattenJsonLd(node, acc = []) {
  if (!node) return acc;
  if (Array.isArray(node)) {
    node.forEach((item) => flattenJsonLd(item, acc));
    return acc;
  }
  acc.push(node);
  if (node['@graph']) flattenJsonLd(node['@graph'], acc);
  return acc;
}

function pickBestJobPosting(jsonLdBlocks = []) {
  const flattened = flattenJsonLd(jsonLdBlocks);
  return flattened.find((item) => {
    const t = item?.['@type'];
    return t === 'JobPosting' || (Array.isArray(t) && t.includes('JobPosting'));
  }) || null;
}

function pickMeta($, names = []) {
  for (const name of names) {
    const content = $(name).attr('content') || $(name).text();
    const cleaned = cleanText(content);
    if (cleaned) return cleaned;
  }
  return '';
}

function extractTitle($, url = '') {
  const candidates = [
    pickMeta($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']),
    $('[data-testid*="job-title"]').first().text(),
    $('h1').first().text(),
    $('title').first().text()
  ].map(cleanText).filter(Boolean);
  if (candidates.length) return candidates[0];
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'Job posting';
  }
}

function extractDescription($, platform) {
  const selectorsByPlatform = {
    linkedin: ['.show-more-less-html__markup', '.description__text', 'main', 'body'],
    greenhouse: ['#content', '.content', '#app-body', 'main', 'body'],
    lever: ['.section-wrapper.page-full-width', '.posting-page', '.content', 'main', 'body'],
    workday: ['[data-automation-id="jobPostingDescription"]', '[data-automation-id="externalPosting"]', 'main', 'body'],
    generic: ['[data-testid*="jobDescription"]', '[class*="job-description"]', '[class*="description"]', 'main', 'article', 'body']
  };
  const selectors = selectorsByPlatform[platform] || selectorsByPlatform.generic;
  for (const selector of selectors) {
    const text = cleanText($(selector).first().text());
    if (text && text.length > 400) return text;
  }
  return cleanText($.root().text());
}

async function parseJobPostingUrl(url) {
  if (!url) return { url: '', title: '', text: '' };
  const platform = detectPlatform(url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 JobNovaBot/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  if (!response.ok) {
    throw new Error(`Could not fetch job posting (${response.status})`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const jobPosting = pickBestJobPosting(extractJsonLd($));

  const title = cleanText(jobPosting?.title || extractTitle($, url));
  const company = cleanText(
    jobPosting?.hiringOrganization?.name ||
    pickMeta($, ['meta[property="og:site_name"]', 'meta[name="application-name"]']) ||
    $('[data-automation-id="company"]').first().text() ||
    $('.topcard__org-name-link, .posting-headline h2').first().text() || ''
  );
  const location = cleanText(
    jobPosting?.jobLocation?.address?.addressLocality ||
    jobPosting?.jobLocation?.address?.addressRegion ||
    $('[data-automation-id="location"]').first().text() ||
    $('.topcard__flavor--bullet').first().text() || ''
  );
  const salary = cleanText(jobPosting?.baseSalary?.value?.value || $('[data-automation-id="salary"]').first().text() || '');
  const description = cleanText(
    jobPosting?.description ? stripHtml(jobPosting.description) : extractDescription($, platform)
  )
    .replace(/(apply now|sign in|privacy policy|cookie policy|terms of use|create account|similar jobs|share this job)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    url,
    title,
    company,
    location,
    salary,
    text: description.slice(0, 24000),
    source: jobPosting ? `${platform}+jsonld` : platform
  };
}

module.exports = { parseJobPostingUrl, stripHtml, cleanText, detectPlatform };
