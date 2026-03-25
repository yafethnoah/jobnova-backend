const fs = require('fs/promises');
const path = require('path');
const { extractTextFromPdfImages, extractTextFromImageBuffer, hasEnoughText } = require('./ocrService');

function cleanText(value = '') {
  return String(value || '')
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\t ]{2,}/g, ' ')
    .trim();
}

function inferTextFromBinary(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return '';
  const raw = buffer.toString('latin1');
  const matches = raw.match(/[A-Za-z0-9][A-Za-z0-9 ,.;:()@#%&+_\-\/\\]{5,}/g) || [];
  return cleanText(matches.join(' '));
}

async function parsePdf(filePath, buffer) {
  const pdfParse = require('pdf-parse');
  try {
    const data = buffer ? await pdfParse(buffer) : await pdfParse(await fs.readFile(filePath));
    const text = cleanText(data?.text || '');
    if (hasEnoughText(text)) return { text, extractionMode: 'pdf-text', usedOcr: false };
  } catch {}
  const ocr = await extractTextFromPdfImages(filePath);
  if (hasEnoughText(ocr.text)) return { text: cleanText(ocr.text), extractionMode: ocr.mode, usedOcr: true };
  const fallbackBuffer = buffer || await fs.readFile(filePath);
  return { text: inferTextFromBinary(fallbackBuffer), extractionMode: 'pdf-binary-fallback', usedOcr: false };
}

async function parseDocx(filePath, buffer) {
  const mammoth = require('mammoth');
  const result = buffer ? await mammoth.extractRawText({ buffer }) : await mammoth.extractRawText({ path: filePath });
  return { text: cleanText(result?.value || ''), extractionMode: 'docx', usedOcr: false };
}

async function parseImage(buffer) {
  const ocr = await extractTextFromImageBuffer(buffer);
  return { text: cleanText(ocr.text || ''), extractionMode: ocr.mode || 'image-ocr', usedOcr: true };
}

async function parseResumeBuffer({ filePath, fileName, mimeType, buffer, includeMeta = false }) {
  const ext = path.extname(fileName || filePath || '').toLowerCase();
  let result = { text: '', extractionMode: 'unknown', usedOcr: false };

  if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    result = await parseDocx(filePath, buffer);
  } else if (ext === '.pdf' || mimeType === 'application/pdf') {
    result = await parsePdf(filePath, buffer);
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) || /^image\//.test(mimeType || '')) {
    result = await parseImage(buffer || (filePath ? await fs.readFile(filePath).catch(() => null) : null));
  } else if (ext === '.doc') {
    const fallbackBuffer = buffer || (filePath ? await fs.readFile(filePath).catch(() => null) : null);
    result = { text: cleanText(inferTextFromBinary(fallbackBuffer)), extractionMode: 'doc-binary-fallback', usedOcr: false };
  } else if (ext === '.txt' || ext === '.md' || String(mimeType || '').startsWith('text/')) {
    const text = buffer ? buffer.toString('utf8') : await fs.readFile(filePath, 'utf8');
    result = { text: cleanText(text), extractionMode: 'text', usedOcr: false };
  }

  if (result.extractionMode === 'unknown') {
    const fallbackBuffer = buffer || (filePath ? await fs.readFile(filePath).catch(() => null) : null);
    result = { text: cleanText(inferTextFromBinary(fallbackBuffer)), extractionMode: 'binary-fallback', usedOcr: false };
  }

  return includeMeta ? result : result.text;
}

module.exports = { parseResumeBuffer, cleanText };
