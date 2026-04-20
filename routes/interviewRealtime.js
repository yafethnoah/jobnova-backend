const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { saveState } = require('../data/store');
const {
  realtimeSessionSchema,
  realtimeEventSchema,
  realtimeMetricsSchema,
  parse,
} = require('../lib/validation');
const { enqueue } = require('../lib/jobQueue');
const { scoreRealtimeInterview } = require('../services/realtimeScoring');
const {
  analyzeAnswerForInterruptions,
  buildInterruptionPrompt,
} = require('../services/recruiterInterruptionEngine');
const {
  nextPressureState,
  getEscalationInstruction,
} = require('../services/pressureEscalation');
const { buildPanelPrompt } = require('../services/panelProfiles');

const router = express.Router();

const DEFAULT_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
const DEFAULT_TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';
const DEFAULT_TTL = Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600);
const REALTIME_CONNECT_URL = 'https://api.openai.com/v1/realtime';
const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

function nowIso() {
  return new Date().toISOString();
}

function createSessionId() {
  return `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTranscriptItems(items = []) {
  return [...items]
    .filter((item) => item && item.text)
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime(),
    )
    .map((item) => ({
      id: item.id,
      speaker: item.speaker,
      text: String(item.text || '').trim(),
      final: item.final !== false,
      createdAt: item.createdAt || nowIso(),
      itemId: item.itemId || null,
      providerEventType: item.providerEventType || '',
      providerTimestamp: item.providerTimestamp || null,
      sequence: Number(item.sequence || 0),
    }));
}

function createLiveMemory(base = {}) {
  return {
    weakAnswers: Number(base.weakAnswers || 0),
    unansweredProbes: Array.isArray(base.unansweredProbes)
      ? base.unansweredProbes
      : [],
    repeatedWeaknesses: Array.isArray(base.repeatedWeaknesses)
      ? base.repeatedWeaknesses
      : [],
    examplesUsed: Array.isArray(base.examplesUsed) ? base.examplesUsed : [],
    pressureState: base.pressureState || 'medium',
    currentPanelMember: base.currentPanelMember || 'recruiter',
    lastInterruptionReason: base.lastInterruptionReason || null,
  };
}

function hydrateSession(base = {}, input = {}) {
  return {
    id: base.id || createSessionId(),
    role: input.role || base.role || 'General interview',
    companyName: input.companyName ?? base.companyName ?? '',
    mode: input.mode || base.mode || 'behavioral',
    level: input.level || base.level || 'mid',
    tone: input.tone || base.tone || 'realistic',
    voice: input.voice || base.voice || 'alloy',
    interviewType: input.interviewType || base.interviewType || 'behavioral',
    difficulty: input.difficulty || base.difficulty || 'medium',
    focusAreas: input.focusAreas ?? base.focusAreas ?? '',
    recruiterStyle: input.recruiterStyle || base.recruiterStyle || 'corporate',
    pressureLevel: input.pressureLevel || base.pressureLevel || 'medium',
    followUpStrictness:
      input.followUpStrictness || base.followUpStrictness || 'standard',
    interviewMode: input.interviewMode || base.interviewMode || 'single',
    panelEnabled:
      typeof input.panelEnabled === 'boolean'
        ? input.panelEnabled
        : Boolean(
            base.panelEnabled ||
              (input.interviewMode || base.interviewMode) === 'panel',
          ),
    createdAt: base.createdAt || nowIso(),
    startedAt: base.startedAt || nowIso(),
    endedAt: base.endedAt || null,
    status: base.status || 'created',
    providerSessionId: base.providerSessionId || null,
    providerCallId: base.providerCallId || null,
    lastTokenExpiresAt: base.lastTokenExpiresAt || null,
    transcriptItems: normalizeTranscriptItems(
      base.transcriptItems || base.events || [],
    ),
    metrics: {
      reconnectCount: Number(base?.metrics?.reconnectCount || 0),
      droppedEvents: Number(base?.metrics?.droppedEvents || 0),
      callDurationSec: Number(base?.metrics?.callDurationSec || 0),
      lastKnownConnectionState:
        base?.metrics?.lastKnownConnectionState || 'new',
      assistantSpeechMs: Number(base?.metrics?.assistantSpeechMs || 0),
      userSpeechMs: Number(base?.metrics?.userSpeechMs || 0),
    },
    liveMemory: createLiveMemory(base.liveMemory),
    resumeVersion: Number(base.resumeVersion || 0),
    feedback: base.feedback || null,
    feedbackJobId: base.feedbackJobId || null,
    lastError: base.lastError || null,
    lastReconnectAt: base.lastReconnectAt || null,
  };
}

function getLiveSessions(req) {
  req.userData.liveSessions = req.userData.liveSessions || {};
  return req.userData.liveSessions;
}

function getSession(req, sessionId) {
  const raw = getLiveSessions(req)[sessionId];
  if (!raw) return null;
  const session = hydrateSession(raw);
  getLiveSessions(req)[sessionId] = session;
  return session;
}

function nextPanelMember(current = 'recruiter') {
  if (current === 'recruiter') return 'hiring_manager';
  if (current === 'hiring_manager') return 'director';
  return 'recruiter';
}

function buildInstructions(input) {
  const tone = String(input.tone || 'realistic');
  const mode = String(input.mode || input.interviewType || 'behavioral');
  const level = String(input.level || 'mid');
  const recruiterStyle = String(input.recruiterStyle || 'corporate');
  const pressureLevel = String(input.pressureLevel || 'medium');
  const followUpStrictness = String(input.followUpStrictness || 'standard');
  const interviewMode = String(input.interviewMode || 'single');
  const panelEnabled = Boolean(input.panelEnabled || interviewMode === 'panel');
  const currentPanelMember = String(input.currentPanelMember || 'recruiter');
  const escalationInstruction = String(
    input.escalationInstruction ||
      getEscalationInstruction(input.liveMemory?.weakAnswers || 0),
  );

  const difficultyLabel =
    level === 'senior'
      ? 'senior-level ownership, judgment, stakeholder alignment, measurable business impact, and leadership depth'
      : level === 'entry'
        ? 'clear fundamentals, coachability, honesty, concise structure, and practical judgment'
        : 'mid-level ownership, prioritization, communication, cross-functional execution, and business impact';

  const recruiterProfiles = {
    executive:
      'Sound polished, strategic, direct, and commercially aware. Push for leadership scope, judgment, and organizational influence.',
    corporate:
      'Sound professional, structured, balanced, and credible. Push for STAR clarity, collaboration, consistency, and measurable outcomes.',
    startup:
      'Sound pragmatic, fast, and sharp. Push for ownership, ambiguity handling, speed, prioritization, and trade-offs.',
    nonprofit:
      'Sound thoughtful, human-centered, and mission-aware. Push for stakeholder trust, constraints, service impact, and credibility.',
  };

  const toneInstruction =
    tone === 'strict'
      ? 'Challenge weak answers politely. Do not let vague answers pass.'
      : tone === 'supportive'
        ? 'Stay warm and respectful, but still press for evidence, ownership, and results.'
        : 'Stay realistic, calm, and recruiter-like. Avoid sounding overly soft or robotic.';

  const pressureInstruction =
    pressureLevel === 'high'
      ? 'Create realistic pressure. Interrupt gently when the candidate rambles, dodges, or stays too abstract.'
      : pressureLevel === 'low'
        ? 'Keep the call calm and professional, but still ask meaningful follow-ups.'
        : 'Maintain moderate interview pressure and ask concise follow-up questions when needed.';

  const followUpInstruction =
    followUpStrictness === 'aggressive'
      ? "Use frequent follow-ups. Push for evidence, personal ownership, metrics, and what changed because of the candidate's work."
      : followUpStrictness === 'sharp'
        ? 'Use pointed follow-ups whenever the answer lacks specifics, metrics, or decision quality.'
        : 'Use natural recruiter follow-ups when an answer needs clarification or evidence.';

  const panelPrompt = panelEnabled
    ? buildPanelPrompt(currentPanelMember, { role: input.role, level })
    : null;

  return [
    `You are a highly experienced recruiter conducting a live interview for the role ${input.role}.`,
    input.companyName ? `The company is ${input.companyName}.` : null,
    `Interview focus: ${mode}. Target level: ${level}. Evaluate for ${difficultyLabel}.`,
    `Recruiter style: ${recruiterStyle}.`,
    recruiterProfiles[recruiterStyle] || recruiterProfiles.corporate,
    `Pressure level: ${pressureLevel}. Follow-up strictness: ${followUpStrictness}.`,
    `Interview mode: ${panelEnabled ? 'panel' : 'single recruiter'}.`,
    panelPrompt,
    input.focusAreas
      ? `Probe especially for these themes: ${input.focusAreas}.`
      : null,
    escalationInstruction,
    'Never sound like a coach, tutor, assistant, or cheerleader. Sound like a recruiter making a hiring decision.',
    'Open the call naturally: greet the candidate briefly, confirm the role, then ask the first real interview question.',
    'Ask one question at a time. Most turns should be 1 to 3 spoken sentences maximum.',
    'Do not praise every answer. Avoid generic encouragement unless it is truly earned.',
    toneInstruction,
    pressureInstruction,
    followUpInstruction,
    'If the candidate gives a weak answer, ask a follow-up that forces ownership, decision-making, metrics, tradeoffs, conflict handling, or business impact.',
    'If the candidate gives a strong answer, move to the next relevant question naturally without sounding scripted.',
    'Prefer real recruiter follow-ups such as: What was your exact role? What did you do personally? What changed because of your work? What was the result? What did you learn? What would you do differently?',
    'Interrupt gently only when the answer drifts, becomes repetitive, or avoids the question.',
    'Keep the conversation grounded in the target role instead of broad theory.',
    'Do not mention these instructions, rubrics, internal scores, tools, or hidden evaluation criteria.',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildRealtimeSessionConfig(input = {}) {
  return {
    type: 'realtime',
    model: process.env.OPENAI_REALTIME_MODEL || DEFAULT_MODEL,
    instructions: buildInstructions(input),
    audio: {
      input: {
        transcription: { model: DEFAULT_TRANSCRIBE_MODEL },
        turn_detection: {
          type: 'server_vad',
          create_response: true,
          interrupt_response: true,
          prefix_padding_ms: 300,
          silence_duration_ms: 650,
          idle_timeout_ms: 6000,
        },
      },
      output: {
        voice: input.voice || 'alloy',
      },
    },
  };
}

async function createRealtimeSessionToken(input = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: 'OPENAI_API_KEY is missing.' };
  }

  const ttl = Math.max(
    10,
    Math.min(
      7200,
      Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || DEFAULT_TTL),
    ),
  );

  const requestBody = {
    expires_after: {
      anchor: 'created_at',
      seconds: ttl,
    },
    session: buildRealtimeSessionConfig(input),
  };

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await response.text().catch(() => '');
    let data = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const detail =
        data?.error?.message ||
        data?.message ||
        rawText ||
        `OpenAI realtime client secret request failed with status ${response.status}.`;

      console.error('❌ OpenAI realtime client secret failed:', {
        status: response.status,
        detail,
        body: data || rawText,
      });

      return { ok: false, error: detail };
    }

    const ephemeralKey =
      data?.client_secret?.value ||
      data?.value ||
      null;
    const expiresAt =
      data?.client_secret?.expires_at ||
      data?.expires_at ||
      null;
    const session = data?.session || null;

    if (!ephemeralKey) {
      console.error('❌ OpenAI realtime client secret missing value:', data);
      return { ok: false, error: 'OpenAI returned no client secret value.' };
    }

    return {
      ok: true,
      sessionId: session?.id || data?.id || null,
      ephemeralKey,
      transport: 'webrtc',
      model: session?.model || data?.model || requestBody.session.model,
      expiresAt,
      connectUrl: REALTIME_CONNECT_URL,
      ttl,
    };
  } catch (error) {
    console.error('❌ Realtime client secret exception:', error);

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Realtime client secret request failed.',
    };
  }
}

async function exchangeSdpViaUnifiedInterface(offerSdp, input = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: 'OPENAI_API_KEY is missing.' };
  }

  const form = new FormData();
  form.set('sdp', offerSdp);
  form.set('session', JSON.stringify(buildRealtimeSessionConfig(input)));

  try {
    const response = await fetch(REALTIME_CALLS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    });

    const answerSdp = await response.text().catch(() => '');
    const location = response.headers.get('Location');
    const providerCallId = location?.split('/').pop() || null;

    if (!response.ok) {
      console.error('❌ OpenAI unified SDP exchange failed:', {
        status: response.status,
        body: answerSdp,
      });

      return {
        ok: false,
        error:
          answerSdp ||
          `OpenAI realtime call creation failed with status ${response.status}.`,
      };
    }

    return {
      ok: true,
      answerSdp,
      providerCallId,
      connectUrl: REALTIME_CALLS_URL,
      model: process.env.OPENAI_REALTIME_MODEL || DEFAULT_MODEL,
      transport: 'webrtc',
    };
  } catch (error) {
    console.error('❌ Unified SDP exchange exception:', error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unified SDP exchange failed.',
    };
  }
}

async function buildPreflightStatus(options = {}) {
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const model = DEFAULT_MODEL;
  const ttl = Math.max(
    10,
    Math.min(
      7200,
      Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || DEFAULT_TTL),
    ),
  );

  const checks = [
    {
      id: 'openai_key',
      label: 'OpenAI API key',
      ok: hasApiKey,
      detail: hasApiKey
        ? 'Configured on the backend.'
        : 'Missing OPENAI_API_KEY on the backend.',
    },
    {
      id: 'realtime_model',
      label: 'Realtime model',
      ok: Boolean(model),
      detail: `Using ${model}.`,
    },
    {
      id: 'transport',
      label: 'Client transport',
      ok: true,
      detail:
        'Live recruiter mode expects a native WebRTC build on the device.',
    },
    {
      id: 'webrtc_endpoint',
      label: 'WebRTC endpoint',
      ok: true,
      detail: `Server-mediated SDP negotiation will use ${REALTIME_CALLS_URL}.`,
    },
    {
      id: 'ttl',
      label: 'Client secret lifetime reference',
      ok: ttl >= 60,
      detail: `Client secret TTL reference is ${ttl} seconds.`,
    },
  ];

  let providerProbe = null;

  if (options.probe) {
    const probe = await createRealtimeSessionToken({
      role: 'Live recruiter probe',
      mode: 'behavioral',
      level: 'mid',
      tone: 'realistic',
      voice: 'alloy',
      focusAreas: 'probe only',
    });

    providerProbe = probe.ok
      ? {
          ok: true,
          detail:
            'OpenAI accepted the backend credentials and returned a realtime client secret.',
          sessionId: probe.sessionId || null,
          expiresAt: probe.expiresAt || null,
        }
      : {
          ok: false,
          detail: probe.error || 'OpenAI rejected the realtime token request.',
        };

    checks.push({
      id: 'provider_probe',
      label: 'Live provider probe',
      ok: providerProbe.ok,
      detail: providerProbe.detail,
    });
  }

  const ok = checks.every((item) => item.ok);

  return {
    ok,
    mode: 'webrtc_live_recruiter',
    transport: 'webrtc',
    model,
    connectUrl: REALTIME_CALLS_URL,
    expiresInSeconds: ttl,
    providerProbe,
    checks,
    summary: ok
      ? 'Backend realtime prerequisites look ready. Continue to the live recruiter session from a custom or production build.'
      : 'Realtime mode is not ready yet. Fix the failed checks before starting the live recruiter session.',
  };
}

router.get('/preflight', optionalAuth, async (req, res, next) => {
  try {
    const probe = String(req.query.probe || '') === '1';
    res.json(await buildPreflightStatus({ probe }));
  } catch (error) {
    next(error);
  }
});

router.post('/client-secret', requireAuth, async (req, res, next) => {
  try {
    const input = parse(realtimeSessionSchema, req.body);
    const liveToken = await createRealtimeSessionToken(input);

    if (!liveToken?.ok) {
      return res.status(503).json({
        message:
          liveToken?.error ||
          'Realtime client secret could not be created. Check OPENAI_API_KEY and realtime model settings.',
      });
    }

    return res.json({
      clientSecret: liveToken.ephemeralKey,
      transport: liveToken.transport,
      model: liveToken.model,
      providerSessionId: liveToken.sessionId,
      expiresAt: liveToken.expiresAt,
      connectUrl: liveToken.connectUrl,
      interviewMode: input.interviewMode || 'single',
      panelEnabled: Boolean(
        input.panelEnabled || input.interviewMode === 'panel',
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/session', requireAuth, async (req, res, next) => {
  try {
    const input = parse(realtimeSessionSchema, req.body);

    const session = hydrateSession(
      {
        id: createSessionId(),
        status: 'active',
      },
      input,
    );

    getLiveSessions(req)[session.id] = session;
    await saveState();

    return res.json({
      sessionId: session.id,
      transport: 'webrtc',
      model: process.env.OPENAI_REALTIME_MODEL || DEFAULT_MODEL,
      providerSessionId: session.providerSessionId,
      providerCallId: session.providerCallId,
      connectUrl: REALTIME_CALLS_URL,
      note: session.panelEnabled
        ? 'Realtime panel session created successfully.'
        : 'Realtime session created successfully.',
      diagnostics: await buildPreflightStatus(),
      interviewMode: session.interviewMode,
      panelEnabled: session.panelEnabled,
      currentPanelMember: session.liveMemory.currentPanelMember,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/session/:id/sdp',
  requireAuth,
  express.text({ type: ['application/sdp', 'text/plain'], limit: '1mb' }),
  async (req, res, next) => {
    try {
      const session = getSession(req, req.params.id);

      if (!session) {
        return res.status(404).json({ message: 'Live session not found.' });
      }

      if (session.status === 'ended') {
        return res.status(409).json({
          message: 'This live session is already ended and cannot connect.',
        });
      }

      const offerSdp = String(req.body || '').trim();
      if (!offerSdp) {
        return res.status(400).json({ message: 'Missing SDP offer body.' });
      }

      const sdpResult = await exchangeSdpViaUnifiedInterface(offerSdp, {
        role: session.role,
        companyName: session.companyName,
        mode: session.mode,
        level: session.level,
        tone: session.tone,
        voice: session.voice,
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        focusAreas: session.focusAreas,
        recruiterStyle: session.recruiterStyle,
        pressureLevel: session.pressureLevel,
        followUpStrictness: session.followUpStrictness,
        interviewMode: session.interviewMode,
        panelEnabled: session.panelEnabled,
        currentPanelMember: session.liveMemory.currentPanelMember,
        liveMemory: session.liveMemory,
      });

      if (!sdpResult?.ok) {
        session.lastError = sdpResult?.error || 'Realtime SDP exchange failed.';
        await saveState();
        return res.status(503).send(session.lastError);
      }

      session.status = 'active';
      session.lastReconnectAt = nowIso();
      session.providerCallId = sdpResult.providerCallId || session.providerCallId || null;
      session.metrics.lastKnownConnectionState = 'connected';
      await saveState();

      if (sdpResult.providerCallId) {
        res.setHeader(
          'Location',
          `/v1/realtime/calls/${sdpResult.providerCallId}`,
        );
      }

      res.type('application/sdp').send(sdpResult.answerSdp);
    } catch (error) {
      next(error);
    }
  },
);

router.get('/session/:id/resume', requireAuth, async (req, res, next) => {
  try {
    const session = getSession(req, req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Live session not found.' });
    }

    return res.json({
      sessionId: session.id,
      status: session.status,
      role: session.role,
      companyName: session.companyName,
      providerSessionId: session.providerSessionId,
      providerCallId: session.providerCallId,
      recruiterStyle: session.recruiterStyle,
      pressureLevel: session.pressureLevel,
      followUpStrictness: session.followUpStrictness,
      interviewMode: session.interviewMode,
      panelEnabled: session.panelEnabled,
      currentPanelMember: session.liveMemory.currentPanelMember,
      reconnectCount: Number(session.metrics?.reconnectCount || 0),
      resumeVersion: Number(session.resumeVersion || 0),
      transcriptItems: normalizeTranscriptItems(session.transcriptItems),
      metrics: session.metrics || {},
    });
  } catch (error) {
    next(error);
  }
});

router.post('/session/:id/reconnect', requireAuth, async (req, res, next) => {
  try {
    const session = getSession(req, req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Live session not found.' });
    }

    if (session.status === 'ended') {
      return res.status(409).json({
        message: 'This live session is already ended and cannot reconnect.',
      });
    }

    session.lastReconnectAt = nowIso();
    session.status = 'reconnecting';
    session.metrics.reconnectCount =
      Number(session.metrics?.reconnectCount || 0) + 1;

    await saveState();

    return res.json({
      sessionId: session.id,
      transport: 'webrtc',
      model: process.env.OPENAI_REALTIME_MODEL || DEFAULT_MODEL,
      providerSessionId: session.providerSessionId,
      providerCallId: session.providerCallId,
      connectUrl: REALTIME_CALLS_URL,
      note: 'Realtime reconnect prepared successfully.',
      interviewMode: session.interviewMode,
      panelEnabled: session.panelEnabled,
      currentPanelMember: session.liveMemory.currentPanelMember,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/session/:id/metrics', requireAuth, async (req, res, next) => {
  try {
    const metrics = parse(realtimeMetricsSchema, req.body);
    const session = getSession(req, req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Live session not found.' });
    }

    session.metrics = { ...(session.metrics || {}), ...metrics };
    session.resumeVersion = Number(session.resumeVersion || 0) + 1;

    await saveState();
    res.json({ ok: true, metrics: session.metrics });
  } catch (error) {
    next(error);
  }
});

router.post('/session/:id/event', requireAuth, async (req, res, next) => {
  try {
    const input = parse(realtimeEventSchema, req.body);
    const session = getSession(req, req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Live session not found.' });
    }

    if (session.status === 'ended') {
      return res
        .status(409)
        .json({ message: 'This live session has already ended.' });
    }

    const dedupeMatch = session.transcriptItems.find((item) => {
      const sameItem =
        input.itemId && item.itemId && item.itemId === input.itemId;
      const sameExactFinal =
        item.final &&
        input.final &&
        item.speaker === input.speaker &&
        item.text === input.text;

      return sameItem || sameExactFinal;
    });

    if (dedupeMatch) {
      return res.json({
        ok: true,
        count: session.transcriptItems.length,
        deduped: true,
      });
    }

    const trimmedText = input.text.trim();

    session.transcriptItems.push({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      speaker: input.speaker,
      text: trimmedText,
      itemId: input.itemId || null,
      final: input.final !== false,
      providerEventType: input.providerEventType || '',
      providerTimestamp: input.providerTimestamp || null,
      sequence: Number(input.sequence || 0),
      createdAt: nowIso(),
    });

    if (input.final !== false && input.speaker === 'user') {
      const interruption = analyzeAnswerForInterruptions(trimmedText);

      if (interruption.shouldInterrupt) {
        session.liveMemory.lastInterruptionReason = interruption.reason;
        session.liveMemory.repeatedWeaknesses = [
          ...new Set([
            ...session.liveMemory.repeatedWeaknesses,
            interruption.reason,
          ]),
        ].slice(-5);
      }

      if (
        interruption.noMetrics ||
        interruption.noOwnership ||
        interruption.tooVague
      ) {
        const nextPressure = nextPressureState(session.liveMemory);
        session.liveMemory.weakAnswers = nextPressure.weakAnswers;
        session.liveMemory.pressureState = nextPressure.pressureLabel;
      }

      if (session.panelEnabled) {
        session.liveMemory.currentPanelMember = nextPanelMember(
          session.liveMemory.currentPanelMember,
        );
      }
    }

    session.resumeVersion = Number(session.resumeVersion || 0) + 1;
    session.status = 'active';

    await saveState();

    return res.json({
      ok: true,
      count: session.transcriptItems.length,
      interruptionPrompt: session.liveMemory.lastInterruptionReason
        ? buildInterruptionPrompt(session.liveMemory.lastInterruptionReason)
        : null,
      pressureState: session.liveMemory.pressureState,
      currentPanelMember: session.liveMemory.currentPanelMember,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/session/:id/end', requireAuth, async (req, res, next) => {
  try {
    const session = getSession(req, req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Live session not found.' });
    }

    if (session.status === 'ended' && session.feedback) {
      return res.json(session.feedback);
    }

    session.status = 'ended';
    session.endedAt = nowIso();
    session.metrics.callDurationSec = Math.max(
      0,
      Math.round(
        (new Date(session.endedAt).getTime() -
          new Date(session.startedAt || session.createdAt).getTime()) /
          1000,
      ),
    );

    const transcriptItems = normalizeTranscriptItems(
      session.transcriptItems,
    ).filter((evt) => evt.final !== false && evt.text);

    const transcript = transcriptItems
      .map((evt) => `${evt.speaker.toUpperCase()}: ${evt.text}`)
      .join('\n');

    const feedbackJob = await enqueue('interview-score', {
      role: session.role,
      mode: session.mode,
      level: session.level,
      transcript,
    });

    const feedback = await scoreRealtimeInterview({
      role: session.role,
      mode: session.mode,
      level: session.level,
      tone: session.tone,
      transcript,
      events: transcriptItems,
      recruiterStyle: session.recruiterStyle,
      pressureLevel: session.pressureLevel,
      followUpStrictness: session.followUpStrictness,
      interviewMode: session.interviewMode,
    });

    feedback.queueJobId = feedbackJob.id;
    session.feedback = feedback;
    session.feedbackJobId = feedbackJob.id;

    req.userData.interviewSessions = req.userData.interviewSessions || [];
    req.userData.interviewSessions = req.userData.interviewSessions.filter(
      (item) => item.id !== session.id,
    );
    req.userData.interviewSessions.unshift({
      id: session.id,
      role: session.role,
      mode: session.mode,
      level: session.level,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
      feedback,
    });
    req.userData.interviewSessions =
      req.userData.interviewSessions.slice(0, 50);

    await saveState();
    res.json(feedback);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/feedback', requireAuth, (req, res) => {
  const record = (req.userData.interviewSessions || []).find(
    (item) => item.id === req.params.id,
  );

  if (!record) {
    return res.status(404).json({ message: 'Interview feedback not found.' });
  }

  res.json(record.feedback);
});

module.exports = { interviewRealtimeRouter: router };