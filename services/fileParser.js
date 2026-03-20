const fs = require('fs/promises');
const path = require('path');

async function parseResumeBuffer({ filePath, fileName, mimeType, buffer }) {
  const ext = path.extname(fileName || filePath || '').toLowerCase();

  if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = require('mammoth');
    const result = buffer
      ? await mammoth.extractRawText({ buffer })
      : await mammoth.extractRawText({ path: filePath });
    return cleanText(result.value || '');
  }

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    const pdfParse = require('pdf-parse');
    const data = buffer ? await pdfParse(buffer) : await pdfParse(await fs.readFile(filePath));
    return cleanText(data.text || '');
  }

  if (ext === '.txt' || ext === '.md' || mimeType?.startsWith('text/')) {
    const text = buffer ? buffer.toString('utf8') : await fs.readFile(filePath, 'utf8');
    return cleanText(text);
  }

  return '';
}

function cleanText(value = '') {
  return value
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\t ]{2,}/g, ' ')
    .trim();
}

module.exports = { parseResumeBuffer, cleanText };
