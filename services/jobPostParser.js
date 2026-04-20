
const { askOpenAI } = require('../lib/openai');
const cheerio = require('cheerio');
const { extractWithBrowser, isLikelyUseful } = require('./browserExtractor');
const { withRetry } = require('../lib/retry');
const { env } = require('../config/env');

function cleanText(value = '') {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ ]{2,}/g, ' ')
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

function normalizeWhitespace(text = '') {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeEscapedString(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return JSON.parse(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    try {
      return JSON.parse(`"${raw}"`);
    } catch {
      return raw
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\u003C/gi, '<')
        .replace(/\\u003E/gi, '>')
        .replace(/\\u0026/gi, '&')
        .replace(/\\\//g, '/');
    }
  }
}


function detectPlatform(url = '') {
  const s = String(url).toLowerCase();
  if (s.includes('linkedin.com')) return 'linkedin';
  if (s.includes('greenhouse.io')) return 'greenhouse';
  if (s.includes('lever.co')) return 'lever';
  if (s.includes('myworkdayjobs.com') || s.includes('/workday/')) return 'workday';
  if (s.includes('indeed.com')) return 'indeed';
  if (s.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (s.includes('bamboohr.com') || s.includes('/careers/')) return 'bamboohr';
  if (s.includes('ashbyhq.com')) return 'ashby';
  return 'generic';
}

function assertSupportedUrl(url = '') {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Please enter a valid HTTP or HTTPS job posting URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS job posting links are supported.');
  }
}

function looksBlocked(text = '') {
  const s = String(text || '');
  return /captcha|access denied|sign in to continue|unusual traffic|enable javascript|forbidden|cloudflare|page not found|nothing was found at this location|404/i.test(s);
}

function isClearlyInvalidPostingText(text = '') {
  const value = cleanText(text).toLowerCase();
  if (!value) return true;
  const invalidMarkers = [
    'nothing was found at this location',
    'page not found',
    '404',
    'general job application form',
    'volunteer with us'
  ];
  if (invalidMarkers.some((marker) => value.includes(marker))) return true;
  const contactHits = (value.match(/@/g) || []).length + (value.match(/mailto:/g) || []).length;
  const jobHits = (value.match(/responsibilit|requirement|qualification|skills|experience|duties|about the role|position summary/g) || []).length;
  if (contactHits >= 2 && jobHits === 0) return true;
  return false;
}

function looksContactHeavy(text = '') {
  const value = cleanText(text).toLowerCase();
  if (!value) return false;
  const emailHits = (value.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || []).length;
  const phoneHits = (value.match(/(?:\+?\d[\d(). -]{7,}\d)/g) || []).length;
  const linkHits = (value.match(/https?:\/\//g) || []).length;
  const applicationFormHits = (value.match(/first name|last name|upload your resume|upload your cover letter|how did you hear about us|consent|choose file|phone number|email address/g) || []).length;
  const jobHits = (value.match(/responsibilit|requirement|qualification|skills|experience|duties|about the role|position summary|what you'll do|what you will do|about you/g) || []).length;
  return (emailHits + phoneHits + linkHits >= 5 && jobHits < 2) || (applicationFormHits >= 4 && jobHits < 2);
}

function containsMeaningfulJobContent(text = '') {
  const value = cleanText(text).toLowerCase();
  if (!value || value.length < 180) return false;
  if (isClearlyInvalidPostingText(value) || looksContactHeavy(value)) return false;
  const positiveHits = (value.match(/responsibilit|requirement|qualification|skills|experience|duties|benefits|salary|hours|location|contract|full[- ]time|part[- ]time|about the role|about this role|what you'll do|what you will do|about you|position summary/g) || []).length;
  return positiveHits >= 2 || value.length >= 1400;
}

async function fetchAttempt(url, headers, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8') {
  const response = await withRetry(() => fetch(url, { headers: { ...headers, Accept: accept }, redirect: 'follow' }), { retries: 1, baseDelayMs: 800 });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body, finalUrl: response.url || url };
}

async function fetchWithFallback(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 JobNovaBot/1.2',
    'Accept-Language': env.JOB_EXTRACTION_LOCALE || 'en-US,en;q=0.9',
    Referer: url
  };

  const direct = await fetchAttempt(url, headers);
  if (direct.ok && direct.body && direct.body.length > 1200 && !looksBlocked(direct.body) && !isClearlyInvalidPostingText(direct.body)) {
    return { html: direct.body, source: 'direct', finalUrl: direct.finalUrl };
  }

  const mirrors = [
    `https://r.jina.ai/http://${String(url).replace(/^https?:\/\//i, '')}`,
    `https://r.jina.ai/http://${encodeURI(String(url).replace(/^https?:\/\//i, ''))}`
  ];

  for (const mirrorUrl of mirrors) {
    try {
      const mirrored = await fetchAttempt(mirrorUrl, headers, 'text/plain,*/*');
      if (mirrored.ok && mirrored.body && mirrored.body.length > 300 && !looksBlocked(mirrored.body) && !isClearlyInvalidPostingText(mirrored.body)) {
        return { html: mirrored.body, source: 'jina-mirror', finalUrl: direct.finalUrl || url };
      }
    } catch {}
  }

  if (!direct.ok && (!direct.body || direct.body.length < 80)) {
    throw new Error(`Could not fetch job posting (${direct.status})`);
  }

  return { html: direct.body || '', source: direct.ok ? 'direct-partial' : 'direct-error-body', finalUrl: direct.finalUrl || url };
}

function extractJsonLd($) {
  const blocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      blocks.push(JSON.parse(raw));
    } catch {}
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

function pickMeta($, selectors = []) {
  for (const selector of selectors) {
    const value = cleanText($(selector).attr('content') || $(selector).text());
    if (value) return value;
  }
  return '';
}

function titleFromUrl(url = '') {
  try {
    const u = new URL(url);
    const slug = u.pathname.split('/').filter(Boolean).pop() || u.hostname;
    return cleanText(slug.replace(/[-_]+/g, ' ').replace(/\bjobs?\b/gi, ' ').replace(/\s+/g, ' '));
  } catch {
    return 'Job posting';
  }
}

function extractTitle($, url = '') {
  const candidates = [
    pickMeta($, ['meta[property="og:title"]', 'meta[name="twitter:title"]', 'meta[name="title"]']),
    $('[data-testid*="job-title"]').first().text(),
    $('[data-automation-id="jobPostingHeader"]').first().text(),
    $('[class*="job-title"]').first().text(),
    $('h1').first().text(),
    $('title').first().text()
  ].map(cleanText).filter(Boolean);
  return candidates[0] || titleFromUrl(url);
}

const BOILERPLATE_PATTERNS = [
  /privacy policy/i,
  /terms (and conditions|of use)/i,
  /cookie policy/i,
  /newsletter/i,
  /all rights reserved/i,
  /quick links/i,
  /follow us/i,
  /facebook|instagram|twitter|linkedin/i,
  /subscribe/i,
  /contact us/i,
  /upload your resume/i,
  /upload your cover letter/i,
  /email address/i,
  /phone number/i,
  /^submit application$/i,
  /^apply now$/i,
  /^learn more$/i,
  /registered canadian charity/i,
  /created with fabric\.js/i,
  /stay in the loop/i,
  /how did you hear about us/i,
  /first name/i,
  /last name/i,
  /salutation/i,
  /choose file/i,
  /general job application form/i,
  /volunteer with us/i,
  /project manager-step/i,
  /nothing was found at this location/i,
  /page not found/i,
  /^404$/i
];

const JOB_SECTION_PATTERNS = [
  /overview/i,
  /about the role/i,
  /about this role/i,
  /what you'll do/i,
  /what you will do/i,
  /responsibilit/i,
  /requirement/i,
  /qualification/i,
  /core competencies/i,
  /work conditions/i,
  /skills/i,
  /about you/i,
  /position summary/i,
  /job description/i,
  /duties/i
];

function looksBoilerplateLine(line = '') {
  const text = cleanText(line);
  if (!text) return true;
  if (text.length < 2) return true;
  if (/^\[.*\]\(https?:\/\//.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[|*_#>\-\s]+$/.test(text)) return true;
  if (/^[A-Za-z ]{1,25}$/.test(text) && BOILERPLATE_PATTERNS.some((rx) => rx.test(text))) return true;
  return BOILERPLATE_PATTERNS.some((rx) => rx.test(text));
}

function cleanDescriptionText(text = '') {
  const lines = String(text || '')
    .replace(/\[(.*?)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/`{1,3}/g, ' ')
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .filter((line) => !looksBoilerplateLine(line));

  const deduped = [];
  const seen = new Set();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(line);
  }

  return normalizeWhitespace(
    deduped.join('\n')
      .replace(/\b(show more|show less|read more|read less)\b/gi, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ ]{2,}/g, ' ')
  ).trim();
}

function textBlocksFromSelectors($, selectors = []) {
  const blocks = [];
  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const text = normalizeWhitespace($(el).text());
      if (text && text.length > 80) blocks.push(text);
    });
  }
  return blocks;
}

function headingDrivenBlocks($) {
  const headings = $('h1, h2, h3, h4, strong, b').toArray();
  const matches = [];
  for (const el of headings) {
    const heading = cleanText($(el).text()).toLowerCase();
    if (!JOB_SECTION_PATTERNS.some((rx) => rx.test(heading))) continue;
    let combined = heading;
    let sibling = $(el).parent();
    if (!sibling.length) sibling = $(el);
    sibling = sibling.next();
    let guard = 0;
    while (sibling.length && guard < 8) {
      const txt = normalizeWhitespace(sibling.text());
      if (txt && txt.length > 20 && !looksBoilerplateLine(txt)) combined += `\n${txt}`;
      sibling = sibling.next();
      guard += 1;
    }
    if (combined.length > 150) matches.push(combined);
  }
  return matches;
}

function extractEmbeddedField(source = '', keys = []) {
  for (const key of keys) {
    const rx = new RegExp(`(?:\"|')${key}(?:\"|')\\s*:\\s*(?:\"|')((?:\\\\.|[^\"']){2,20000}?)(?:\"|')`, 'i');
    const match = String(source || '').match(rx);
    if (match?.[1]) return cleanText(stripHtml(decodeEscapedString(match[1])));
  }
  return '';
}

function extractEmbeddedJobData($) {
  const scripts = $('script').toArray().map((el) => $(el).contents().text()).filter(Boolean);
  const merged = scripts.join('\n');
  const description = extractEmbeddedField(merged, ['description', 'jobDescription', 'postingDescription', 'externalDescription']);
  const title = extractEmbeddedField(merged, ['title', 'jobTitle', 'postingTitle', 'name']);
  const company = extractEmbeddedField(merged, ['companyName', 'company', 'hiringOrganization']);
  const location = extractEmbeddedField(merged, ['location', 'locations', 'jobLocation', 'formattedLocation']);
  return { title, company, location, description };
}

function scoreBlock(text = '') {
  const value = cleanDescriptionText(text);
  if (!value) return -999;
  let score = Math.min(value.length / 20, 120);
  if (JOB_SECTION_PATTERNS.some((rx) => rx.test(value))) score += 60;
  if (/responsibilit|requirement|qualification|skills|experience/i.test(value)) score += 40;
  if (/salary|benefits|full[- ]time|contract|remote|hours/i.test(value)) score += 20;
  if ((value.match(/\n/g) || []).length >= 8) score += 10;
  if (looksContactHeavy(value)) score -= 180;
  if (/newsletter|privacy policy|all rights reserved|contact us|upload your resume/i.test(value)) score -= 120;
  if (value.length < 250) score -= 40;
  return score;
}

function extractDescription($, platform, rawFallback = '') {
  const selectorsByPlatform = {
    linkedin: ['.show-more-less-html__markup', '.description__text', '.jobs-description__container', '.jobs-box__html-content', '[data-testid*="job-details"]', 'main'],
    greenhouse: ['#content', '.content', '#app-body', '#main', '.opening', 'main', 'article'],
    lever: ['.section-wrapper.page-full-width', '.posting-page', '.posting', '.content', 'main', 'article'],
    workday: ['[data-automation-id="jobPostingDescription"]', '[data-automation-id="externalPosting"]', '[data-automation-id="jobPostingDescriptionSection"]', 'main', 'article'],
    indeed: ['#jobDescriptionText', '[data-testid="jobsearch-JobComponent-description"]', '[data-testid*="jobDetails"]', 'main', 'article'],
    smartrecruiters: ['[data-testid="job-description"]', '[class*="jobDescription"]', '[class*="job-description"]', '[class*="details"]', 'main', 'article'],
    bamboohr: ['[class*="BambooHR-ATS-Board"]', '[class*="BambooHR-ATS-Jobs-Item"]', '[class*="job-description"]', '[class*="description"]', 'main', 'article'],
    ashby: ['[data-testid*="job-posting"]', '[class*="job-posting"]', '[class*="description"]', '[class*="content"]', 'main', 'article'],
    generic: ['[data-testid*="jobDescription"]', '[data-testid*="description"]', '[itemprop="description"]', '[class*="job-description"]', '[class*="jobDescription"]', '[class*="posting"]', '[class*="description"]', '[role="main"]', 'main', 'article', 'body']
  };
  const selectors = selectorsByPlatform[platform] || selectorsByPlatform.generic;
  const candidateBlocks = [...textBlocksFromSelectors($, selectors), ...headingDrivenBlocks($)]
    .map(cleanDescriptionText)
    .filter(Boolean)
    .filter((block) => !looksContactHeavy(block))
    .sort((a, b) => scoreBlock(b) - scoreBlock(a));

  if (candidateBlocks[0] && containsMeaningfulJobContent(candidateBlocks[0])) return candidateBlocks[0];

  const embedded = extractEmbeddedJobData($);
  if (embedded.description && containsMeaningfulJobContent(embedded.description)) return cleanDescriptionText(embedded.description);

  const metaDescription = pickMeta($, ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']);
  if (metaDescription && metaDescription.length > 120 && !looksContactHeavy(metaDescription)) return cleanDescriptionText(metaDescription);

  const fallback = cleanDescriptionText(rawFallback || $.root().text());
  if (looksContactHeavy(fallback)) return '';
  return fallback;
}

function looksJobLikeLine(line = '') {
  const text = cleanText(line);
  if (!text) return false;
  if (JOB_SECTION_PATTERNS.some((rx) => rx.test(text))) return true;
  if (/project manager|job title|employment type|salary|full[- ]time|contract|location/i.test(text)) return true;
  if (/newcomers|refugees|stakeholders|training providers|funders|participants/i.test(text)) return true;
  return false;
}

function trimMirrorText(raw = '') {
  const body = String(raw || '').replace(/^Title:\s*/i, '').trim();
  const lines = body.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const cleaned = lines
    .map((line) => line.replace(/\[(.*?)\]\((https?:\/\/[^)]+)\)/g, '$1').trim())
    .filter(Boolean)
    .filter((line) => !looksBoilerplateLine(line));

  let start = cleaned.findIndex((line) => looksJobLikeLine(line));
  if (start < 0) start = 0;

  let end = cleaned.length;
  for (let i = start + 1; i < cleaned.length; i += 1) {
    const line = cleaned[i];
    if (/newsletter|privacy policy|terms and conditions|all rights reserved|quick links|upload your resume|general job application form|volunteer with us/i.test(line)) {
      end = i;
      break;
    }
  }

  const sliced = cleaned.slice(start, end);
  const sectionsOnly = sliced.filter((line, index) => {
    if (looksJobLikeLine(line)) return true;
    const prev = sliced[index - 1] || '';
    return looksJobLikeLine(prev) || line.length > 40;
  });

  const trimmed = cleanDescriptionText(sectionsOnly.join('\n'));
  return looksContactHeavy(trimmed) ? '' : trimmed;
}


function safeJson(raw) {
  const source = String(raw || '').trim();
  const jsonBlock = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (jsonBlock && jsonBlock[1]) || (source.match(/\{[\s\S]*\}/) || [])[0] || source;
  return JSON.parse(candidate);
}

function clampText(text = '', limit = 12000) {
  return String(text || '').slice(0, limit);
}

function extractListsFromText(text = '') {
  const lines = String(text || '').split(/\n+/).map((line) => cleanText(line)).filter(Boolean);
  const sections = { responsibilities: [], requirements: [], skills: [] };
  let mode = '';
  for (const line of lines) {
    if (/responsibilit|what you'll do|what you will do|duties/i.test(line)) { mode = 'responsibilities'; continue; }
    if (/requirement|qualification|what we're looking for|about you|experience/i.test(line)) { mode = 'requirements'; continue; }
    if (/skills|core competencies|competencies/i.test(line)) { mode = 'skills'; continue; }
    if (!mode) continue;
    if (looksBoilerplateLine(line)) continue;
    if (JOB_SECTION_PATTERNS.some((rx) => rx.test(line))) continue;
    sections[mode].push(line.replace(/^[-•*]\s*/, ''));
  }
  return {
    responsibilities: Array.from(new Set(sections.responsibilities)).slice(0, 10),
    requirements: Array.from(new Set(sections.requirements)).slice(0, 10),
    skills: Array.from(new Set(sections.skills)).slice(0, 15)
  };
}

async function refineExtractedJobPosting({ url = '', platform = 'generic', source = '', extractionMethod = '', title = '', company = '', location = '', salary = '', text = '' }) {
  const cleaned = looksContactHeavy(text) ? '' : cleanDescriptionText(text);
  const extractedLists = extractListsFromText(cleaned);
  const sectionFallback = buildSectionFallback(cleaned);
  if (!cleaned || cleaned.length < 240) {
    return {
      title: cleanText(title),
      company: cleanText(company),
      location: cleanText(location),
      salary: cleanText(salary),
      text: sectionFallback.text || cleaned,
      responsibilities: extractedLists.responsibilities.length ? extractedLists.responsibilities : sectionFallback.responsibilities,
      requirements: extractedLists.requirements.length ? extractedLists.requirements : sectionFallback.requirements,
      skills: extractedLists.skills.length ? extractedLists.skills : sectionFallback.skills,
      confidence: cleaned.length > 120 ? 'medium' : 'low',
      warning: cleaned.length > 120 ? '' : 'Only a partial job description could be recovered from this link.',
      cleanedByAi: false
    };
  }

  const prompt = [
    'You extract recruiter-usable job descriptions from raw web page text.',
    'Return strict JSON only with keys title,company,location,salary,text,responsibilities,requirements,skills,confidence,warning.',
    'Goal: keep only the real job posting content and remove navigation, cookie banners, privacy text, account prompts, marketing copy, repeated application forms, and duplicated boilerplate.',
    'Rules:',
    '- preserve facts exactly; do not invent requirements, salary, company, tools, credentials, or location',
    '- keep the cleaned text highly usable for ATS matching and resume tailoring',
    '- text should be a polished job description summary in plain text, 250 to 2200 words when enough source exists',
    '- responsibilities, requirements, and skills must be arrays of concise strings grounded in the source text only',
    '- confidence must be one of high, medium, low',
    '- warning should be empty unless the source is incomplete, blocked, duplicated, or noisy',
    `Source URL: ${url}`,
    `Platform: ${platform}`,
    `Source type: ${source}`,
    `Extraction method: ${extractionMethod}`,
    `Detected title: ${title}`,
    `Detected company: ${company}`,
    `Detected location: ${location}`,
    `Detected salary: ${salary}`,
    'RAW PAGE TEXT START',
    clampText(cleaned, 12000),
    'RAW PAGE TEXT END'
  ].join('\n');

  try {
    const out = await askOpenAI(prompt);
    if (out) {
      const parsed = safeJson(out);
      const refinedText = cleanDescriptionText(parsed?.text || cleaned).slice(0, 24000);
      return {
        title: cleanText(parsed?.title || title),
        company: cleanText(parsed?.company || company),
        location: cleanText(parsed?.location || location),
        salary: cleanText(parsed?.salary || salary),
        text: refinedText.length >= cleaned.length * 0.45 ? refinedText : (sectionFallback.text || cleaned),
        responsibilities: Array.isArray(parsed?.responsibilities) && parsed.responsibilities.length ? parsed.responsibilities.map(cleanText).filter(Boolean).slice(0, 10) : (extractedLists.responsibilities.length ? extractedLists.responsibilities : sectionFallback.responsibilities),
        requirements: Array.isArray(parsed?.requirements) && parsed.requirements.length ? parsed.requirements.map(cleanText).filter(Boolean).slice(0, 10) : (extractedLists.requirements.length ? extractedLists.requirements : sectionFallback.requirements),
        skills: Array.isArray(parsed?.skills) && parsed.skills.length ? parsed.skills.map(cleanText).filter(Boolean).slice(0, 15) : (extractedLists.skills.length ? extractedLists.skills : sectionFallback.skills),
        confidence: ['high', 'medium', 'low'].includes(String(parsed?.confidence || '').toLowerCase()) ? String(parsed.confidence).toLowerCase() : 'medium',
        warning: cleanText(parsed?.warning || ''),
        cleanedByAi: true
      };
    }
  } catch {}

  return {
    title: cleanText(title),
    company: cleanText(company),
    location: cleanText(location),
    salary: cleanText(salary),
    text: sectionFallback.text || cleaned,
    responsibilities: extractedLists.responsibilities.length ? extractedLists.responsibilities : sectionFallback.responsibilities,
    requirements: extractedLists.requirements.length ? extractedLists.requirements : sectionFallback.requirements,
    skills: extractedLists.skills.length ? extractedLists.skills : sectionFallback.skills,
    confidence: cleaned.length > 1800 ? 'high' : 'medium',
    warning: '',
    cleanedByAi: false
  };
}

async function parseJobPostingUrl(url) {
  if (!url) return { url: '', title: '', text: '' };
  assertSupportedUrl(url);
  const platform = detectPlatform(url);
  let fetched = await fetchWithFallback(url);
  let browserUsed = false;

  if (!fetched.html || fetched.html.length < 1200 || fetched.source === 'direct-partial' || fetched.source === 'direct-error-body' || looksBlocked(fetched.html)) {
    try {
      const browser = await extractWithBrowser(url);
      if (browser?.html && (browser.source === 'browser-rendered' || isLikelyUseful(browser.text))) {
        fetched = { html: browser.html, source: browser.source, finalUrl: browser.finalUrl || fetched.finalUrl || url, browserText: browser.text || '', browserTitle: browser.title || '' };
        browserUsed = true;
      }
    } catch {}
  }

  if (fetched.source === 'jina-mirror') {
    const mirroredText = trimMirrorText(fetched.html).slice(0, 24000);
    const refined = await refineExtractedJobPosting({
      url,
      platform,
      source: `${platform}+mirror`,
      extractionMethod: 'mirror-text',
      title: titleFromUrl(url),
      text: mirroredText
    });
    return {
      url,
      finalUrl: fetched.finalUrl || url,
      title: refined.title || titleFromUrl(url),
      company: refined.company || '',
      location: refined.location || '',
      salary: refined.salary || '',
      text: refined.text || mirroredText,
      responsibilities: refined.responsibilities || [],
      requirements: refined.requirements || [],
      skills: refined.skills || [],
      confidence: refined.confidence || 'medium',
      source: `${platform}+mirror`,
      extractionMethod: refined.cleanedByAi ? 'mirror-text+ai-clean' : 'mirror-text',
      warning: refined.warning || (mirroredText ? 'This site appears heavily client-rendered or access-restricted. Review the extracted text before tailoring.' : 'JobNova could not recover a reliable full job description from this page. Paste the duties, skills, and qualifications manually before tailoring.')
    };
  }

  const html = fetched.html;
  const $ = cheerio.load(html);
  const jobPosting = pickBestJobPosting(extractJsonLd($));
  const embedded = extractEmbeddedJobData($);

  const title = cleanText(jobPosting?.title || embedded.title || fetched.browserTitle || extractTitle($, fetched.finalUrl || url));
  const company = cleanText(
    jobPosting?.hiringOrganization?.name ||
    embedded.company ||
    pickMeta($, ['meta[property="og:site_name"]', 'meta[name="application-name"]', 'meta[name="author"]']) ||
    $('[data-automation-id="company"]').first().text() ||
    $('.topcard__org-name-link, .posting-headline h2').first().text() ||
    ''
  );
  const location = cleanText(
    jobPosting?.jobLocation?.address?.addressLocality ||
    jobPosting?.jobLocation?.address?.addressRegion ||
    embedded.location ||
    $('[data-automation-id="location"]').first().text() ||
    $('.topcard__flavor--bullet').first().text() ||
    ''
  );
  const salary = cleanText(jobPosting?.baseSalary?.value?.value || $('[data-automation-id="salary"]').first().text() || '');
  const rawDescription = cleanText(jobPosting?.description ? stripHtml(jobPosting.description) : (embedded.description || extractDescription($, platform, fetched.browserText || html)));
  const description = isClearlyInvalidPostingText(rawDescription) || looksContactHeavy(rawDescription) ? '' : rawDescription;

  const refined = await refineExtractedJobPosting({
    url,
    platform,
    source: jobPosting ? `${platform}+jsonld` : `${platform}+${fetched.source}`,
    browserRendered: browserUsed,
    extractionMethod: jobPosting ? 'json-ld' : (embedded.description ? 'embedded-script' : 'static-html'),
    title,
    company,
    location,
    salary,
    text: description
  });

  const finalText = isClearlyInvalidPostingText(refined.text || description) || looksContactHeavy(refined.text || description) ? '' : (refined.text || description).slice(0, 24000);
  const warning = refined.warning || (!finalText || finalText.length < 300
    ? 'JobNova could not recover a reliable full job description from this page. Paste the duties, skills, and qualifications manually before tailoring.'
    : fetched.source === 'direct-error-body'
      ? 'The website returned an error page, but JobNova still tried to salvage any visible job text from the response body.'
      : '');

  return {
    url,
    finalUrl: fetched.finalUrl || url,
    title: refined.title || title,
    company: refined.company || company,
    location: refined.location || location,
    salary: refined.salary || salary,
    text: finalText,
    responsibilities: refined.responsibilities || [],
    requirements: refined.requirements || [],
    skills: refined.skills || [],
    confidence: refined.confidence || (jobPosting ? 'high' : 'medium'),
    source: jobPosting ? `${platform}+jsonld` : `${platform}+${fetched.source}`,
    browserRendered: browserUsed,
    extractionMethod: refined.cleanedByAi
      ? (jobPosting ? 'json-ld+ai-clean' : (embedded.description ? 'embedded-script+ai-clean' : (browserUsed ? 'browser-rendered+ai-clean' : 'static-html+ai-clean')))
      : (jobPosting ? 'json-ld' : (embedded.description ? 'embedded-script' : (browserUsed ? 'browser-rendered' : 'static-html'))),
    warning
  };
}

function buildSectionFallback(text = '') {
  const lists = extractListsFromText(text);
  const lines = String(text || '').split(/\n+/).map((line) => cleanText(line)).filter(Boolean);
  const interesting = lines.filter((line) => /responsib|require|qualif|skill|experience|support|coordinate|manage|analy|communicat|maintain|develop/i.test(line));
  const compact = interesting.length ? interesting : lines.filter((line) => line.length > 40);
  const concise = compact.slice(0, 18);
  const summaryText = cleanDescriptionText(concise.join('\n')) || cleanDescriptionText(text);
  return {
    text: summaryText,
    responsibilities: (lists.responsibilities || []).slice(0, 10),
    requirements: (lists.requirements || []).slice(0, 10),
    skills: (lists.skills || []).slice(0, 15)
  };
}

module.exports = { parseJobPostingUrl, stripHtml, cleanText, detectPlatform };
