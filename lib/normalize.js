function cleanString(value = '') {
  if (value == null) return '';
  if (typeof value === 'string') return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (Array.isArray(value)) return value.map((item) => cleanString(item)).filter(Boolean).join(' ').trim();
  if (value && typeof value === 'object') return Object.values(value).map((item) => cleanString(item)).filter(Boolean).join(' ').trim();
  return String(value || '').trim();
}
function uniqueList(items = []) { const seen = new Set(); return items.filter((item) => { const key = cleanString(item).toLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
function toStringList(value, fallback = []) {
  const fallbackList = Array.isArray(fallback) ? fallback.map((item) => cleanString(item)).filter(Boolean) : [];
  if (value == null || value === '') return fallbackList;
  if (Array.isArray(value)) { const flattened = value.flatMap((item) => toStringList(item, [])); return flattened.length ? uniqueList(flattened) : fallbackList; }
  if (typeof value === 'string') {
    const normalized = value.trim().split(/\r?\n|[•;|]+/).map((item) => item.split(',')).flat().map((item) => cleanString(item).replace(/^[-•*]\s*/, '')).filter(Boolean);
    return normalized.length ? uniqueList(normalized) : fallbackList;
  }
  if (typeof value === 'object') { const flattened = Object.values(value).flatMap((item) => toStringList(item, [])); return flattened.length ? uniqueList(flattened) : fallbackList; }
  const rendered = cleanString(value); return rendered ? [rendered] : fallbackList;
}
function safeJoin(value, separator = ', ', fallback = '') { const items = toStringList(value, []); return items.length ? items.join(separator) : fallback; }
function ensureParagraphs(value, fallback = '') {
  if (typeof value === 'string' && value.trim()) return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (Array.isArray(fallback)) return fallback.map((item) => cleanString(item)).filter(Boolean).join('\n');
  return cleanString(fallback);
}
function normalizeExportFormat(value, fallback = 'both') {
  if (value === 'docx' || value === 'pdf' || value === 'both') return value;
  const lowered = toStringList(value, []).map((item) => cleanString(item).toLowerCase()).filter(Boolean);
  if (lowered.includes('both')) return 'both';
  const hasDocx = lowered.some((item) => ['docx', 'word', 'word only'].includes(item));
  const hasPdf = lowered.some((item) => ['pdf', 'pdf only'].includes(item));
  if (hasDocx && hasPdf) return 'both'; if (hasDocx) return 'docx'; if (hasPdf) return 'pdf';
  const raw = cleanString(value).toLowerCase(); if (raw === 'word only' || raw === 'word') return 'docx'; if (raw === 'pdf only') return 'pdf';
  return ['docx', 'pdf', 'both'].includes(raw) ? raw : fallback;
}
function inferFormatFromFileName(fileName = '') { const lower = cleanString(fileName).toLowerCase(); if (lower.endsWith('.pdf')) return 'pdf'; if (lower.endsWith('.docx')) return 'docx'; return 'txt'; }
function normalizeArtifactArray(value) {
  const items = Array.isArray(value) ? value : value == null ? [] : [value];
  return items.filter(Boolean).map((item, index) => {
    const rawFormat = cleanString(item.format || '').toLowerCase();
    const rawType = cleanString(item.type || '').toLowerCase();
    const fileName = cleanString(item.fileName || item.filename || item.name || '') || `artifact-${index + 1}.${rawFormat === 'pdf' ? 'pdf' : rawFormat === 'docx' ? 'docx' : 'txt'}`;
    return { id: item.id || undefined, label: cleanString(item.label || item.type || `File ${index + 1}`) || `File ${index + 1}`, type: ['resume', 'cover-letter', 'recruiter-email'].includes(rawType) ? rawType : 'resume', format: ['docx', 'pdf', 'txt'].includes(rawFormat) ? rawFormat : inferFormatFromFileName(fileName), fileName, downloadUrl: cleanString(item.downloadUrl || item.url || '') || undefined, mimeType: cleanString(item.mimeType || '') || undefined, generatedBy: cleanString(item.generatedBy || '') || undefined, createdAt: cleanString(item.createdAt || '') || undefined, targetRole: cleanString(item.targetRole || '') || undefined, companyName: cleanString(item.companyName || '') || undefined, sizeBytes: Number.isFinite(Number(item.sizeBytes)) ? Number(item.sizeBytes) : undefined };
  }).filter((item) => item.fileName);
}
function normalizeDownloadUrl(baseUrl = '', fileName = '') { const safeBase = cleanString(baseUrl).replace(/\/$/, ''); const safeFile = cleanString(fileName); if (!safeFile) return undefined; return safeBase ? `${safeBase}/downloads/${encodeURIComponent(safeFile)}` : undefined; }
module.exports = { cleanString, toStringList, uniqueList, safeJoin, ensureParagraphs, normalizeExportFormat, normalizeArtifactArray, normalizeDownloadUrl, inferFormatFromFileName };
