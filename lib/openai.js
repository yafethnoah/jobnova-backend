const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function askOpenAI(prompt) {
  const client = getOpenAI();
  if (!client) return null;
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    input: prompt
  });
  return response.output_text || null;
}

async function transcribeAudio(filePath) {
  const client = getOpenAI();
  if (!client || !filePath || !fs.existsSync(filePath)) return null;
  const result = await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'
  });
  return result.text || null;
}

async function synthesizeSpeech(text, filePath, voice = 'alloy') {
  const client = getOpenAI();
  if (!client || !text || !filePath) return null;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const speech = await client.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    voice,
    input: String(text).slice(0, 4000),
    format: 'mp3'
  });
  const buffer = Buffer.from(await speech.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = { getOpenAI, askOpenAI, transcribeAudio, synthesizeSpeech };
