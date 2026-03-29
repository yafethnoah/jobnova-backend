
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
  mode: z.enum(['behavioral', 'technical', 'general']).optional().default('behavioral'),
  level: z.enum(['entry', 'mid', 'senior']).optional().default('mid')
});

const realtimeEventSchema = z.object({
  speaker: z.enum(['user', 'ai']).optional().default('user'),
  text: z.string().min(1).max(4000)
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
  parse
};
