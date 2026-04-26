const { z } = require('zod');
const { AppError } = require('./errors');

const compareSchema = z.object({
  resumeText: z.string().min(20).optional().default(''),
  resume: z.string().optional().default(''),
  jobDescription: z.string().min(20),
  targetRole: z.string().min(2).max(120),
  companyName: z.string().max(120).optional().default(''),
  fullName: z.string().max(120).optional().default('')
});

const rewriteSchema = compareSchema.extend({
  tone: z.enum(['standard', 'confident', 'executive']).optional().default('standard')
});

const exportSchema = z.object({
  targetRole: z.string().min(2).max(120),
  companyName: z.string().max(120).optional().default(''),
  amendedResume: z.string().optional().default(''),
  coverLetter: z.string().optional().default(''),
  recruiterEmail: z.string().optional().default(''),
  selectedExportFormat: z.enum(['docx', 'pdf', 'txt', 'both']).optional().default('both'),
  resumeThemeId: z.string().min(2).optional().default('classic-canadian-professional'),
  layoutMode: z.enum(['one-page', 'two-page']).optional().default('two-page')
});

const realtimeSessionSchema = z.object({
  role: z.string().min(2).max(120),
  companyName: z.string().max(120).optional().default(''),
  mode: z.enum(['behavioral', 'technical', 'general']).optional().default('behavioral'),
  level: z.enum(['entry', 'mid', 'senior']).optional().default('mid'),
  tone: z.enum(['supportive', 'realistic', 'strict']).optional().default('realistic'),
  voice: z.enum(['alloy', 'verse', 'sage', 'ash', 'marin', 'cedar', 'nova']).optional().default('marin'),
  interviewType: z.enum(['behavioral', 'hr', 'technical', 'newcomer_confidence', 'salary']).optional().default('behavioral'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  focusAreas: z.string().max(500).optional().default(''),
  recruiterStyle: z.enum(['corporate', 'executive', 'startup', 'nonprofit']).optional().default('corporate'),
  pressureLevel: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  followUpStrictness: z.enum(['standard', 'sharp', 'aggressive']).optional().default('standard'),
  interviewMode: z.enum(['single', 'panel']).optional().default('single'),
  panelEnabled: z.boolean().optional().default(false)
});

const realtimeEventSchema = z.object({
  speaker: z.enum(['user', 'ai']).optional().default('user'),
  text: z.string().min(1).max(4000),
  itemId: z.string().min(1).max(120).optional().nullable(),
  final: z.boolean().optional().default(true),
  providerEventType: z.string().max(120).optional().default(''),
  providerTimestamp: z.string().max(120).optional().nullable(),
  sequence: z.number().int().nonnegative().optional().default(0),
  sessionResumeVersion: z.number().int().nonnegative().optional().default(0)
});

const realtimeMetricsSchema = z.object({
  reconnectCount: z.number().int().nonnegative().optional(),
  droppedEvents: z.number().int().nonnegative().optional(),
  lastKnownConnectionState: z.string().max(60).optional(),
  assistantSpeechMs: z.number().int().nonnegative().optional(),
  userSpeechMs: z.number().int().nonnegative().optional()
});

function parse(schema, payload) {
  const result = schema.safeParse(payload || {});
  if (!result.success) {
    throw new AppError('Validation failed.', 400, result.error.flatten());
  }
  return result.data;
}

module.exports = {
  compareSchema,
  rewriteSchema,
  exportSchema,
  realtimeSessionSchema,
  realtimeEventSchema,
  realtimeMetricsSchema,
  parse
};
