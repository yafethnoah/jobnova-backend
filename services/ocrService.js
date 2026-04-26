const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { ocrEnabled, env } = require('../config/env');
const { withRetry } = require('../lib/retry');

let visionClient = null;

function hasEnoughText(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim().length >= 250;
}

function hasGoogleVisionCredentials() {
  return Boolean(String(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '').trim());
}

function buildVisionClient() {
  if (!hasGoogleVisionCredentials()) return null;

  let vision;
  try { vision = require('@google-cloud/vision'); } catch { return null; }
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const credentials = JSON.parse(raw);

  return new vision.ImageAnnotatorClient({
    credentials,
    projectId: credentials.project_id,
  });
}

async function ensureVisionClient() {
  if (!visionClient) {
    visionClient = buildVisionClient();
  }
  return visionClient;
}

async function ensureTesseractWorker() {
  let Tesseract;
  try { Tesseract = require('tesseract.js'); } catch { return null; }
  return Tesseract.createWorker(env.OCR_LANGUAGES || 'eng');
}

async function recognizeWithGoogleVision(sourceBuffer) {
  const client = await ensureVisionClient();
  if (!client) return '';

  const [result] = await client.textDetection({
    image: { content: sourceBuffer.toString('base64') },
  });

  return String(result?.fullTextAnnotation?.text || '').trim();
}

async function recognizeWithTesseract(source) {
  const worker = await ensureTesseractWorker();
  if (!worker) return '';
  try {
    const result = await worker.recognize(source);
    return String(result?.data?.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

async function recognizeImage(source, sourceBuffer = null) {
  if (!ocrEnabled) return '';

  return withRetry(async () => {
    if (hasGoogleVisionCredentials() && sourceBuffer) {
      return await recognizeWithGoogleVision(sourceBuffer);
    }
    return await recognizeWithTesseract(source);
  }, { retries: 1, baseDelayMs: 700 });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => (
      code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`))
    ));
  });
}

async function convertPdfToImages(filePath, pages = 2) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jobnova-ocr-'));
  const prefix = path.join(tempDir, 'page');

  try {
    await runCommand('pdftoppm', ['-png', '-f', '1', '-l', String(pages), filePath, prefix]);
    const outputs = [];

    for (let index = 1; index <= pages; index += 1) {
      const candidate = `${prefix}-${index}.png`;
      if (await fileExists(candidate)) outputs.push(candidate);
    }

    return { tempDir, outputs };
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function extractTextFromPdfImages(filePath) {
  if (!ocrEnabled || !filePath) {
    return { text: '', pages: 0, mode: 'disabled' };
  }

  let tempDir = '';

  try {
    const converted = await convertPdfToImages(filePath, 2);
    tempDir = converted.tempDir;

    const parts = [];
    for (const imagePath of converted.outputs) {
      const buffer = await fs.readFile(imagePath);
      const text = await recognizeImage(imagePath, buffer);
      if (text) parts.push(text);
    }

    return {
      text: parts.join('\n\n').trim(),
      pages: converted.outputs.length,
      mode: hasGoogleVisionCredentials() ? 'pdf-ocr-google-vision' : 'pdf-ocr-tesseract',
    };
  } catch (error) {
    return {
      text: '',
      pages: 0,
      mode: 'pdf-ocr-unavailable',
      error: error.message,
    };
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

async function extractTextFromImageBuffer(buffer) {
  if (!ocrEnabled || !buffer) {
    return { text: '', mode: 'disabled' };
  }

  const text = await recognizeImage(buffer, buffer);

  return {
    text,
    mode: hasGoogleVisionCredentials() ? 'image-ocr-google-vision' : 'image-ocr-tesseract',
  };
}

module.exports = {
  hasEnoughText,
  extractTextFromPdfImages,
  extractTextFromImageBuffer,
};
