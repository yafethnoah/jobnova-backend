const { compareResumeToJob, generateTailoredResume, generateApplicationPackage, generateExportBundle } = require('./atsService');
const { getLiveInterviewFeedback } = require('./interviewEngine');

async function processJob(kind, payload) {
  switch (kind) {
    case 'ats-compare':
      return compareResumeToJob(payload);
    case 'resume-rewrite':
      return generateTailoredResume(payload);
    case 'application-package':
      return generateApplicationPackage(payload);
    case 'resume-export': {
      const bundle = await generateExportBundle(payload);
      return {
        files: bundle.files,
        packageResult: bundle.packageResult
      };
    }
    case 'interview-score':
      return getLiveInterviewFeedback(payload);
    default:
      throw new Error(`Unknown job kind: ${kind}`);
  }
}

module.exports = { processJob };
