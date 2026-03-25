const { summarizeUserData } = require('./cloudSync');

function countBy(items = [], getter = (item) => item) {
  return items.reduce((acc, item) => {
    const key = getter(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildDashboard(user, userData) {
  const applications = userData?.applications || [];
  const interviewSessions = userData?.interviewSessions || [];
  const resumeVersions = userData?.resumeVersions || [];
  const resumes = userData?.resumes || [];
  const latestAts = resumes.find((item) => item.type === 'ats-check');
  const latestUpload = resumes.find((item) => item.type !== 'ats-check' && item.extractedText);
  const extractionModes = countBy(resumes.filter((item) => item.type !== 'ats-check'), (item) => item.extractionMode || 'unknown');
  const uploadItems = resumes.filter((item) => item.type !== 'ats-check');
  const pipeline = countBy(applications, (item) => item.status || 'unknown');
  const recentEvents = [
    ...(applications.slice(0, 5).map((item) => ({ type: 'application', createdAt: item.updatedAt || item.createdAt, title: `${item.role || 'Role'} at ${item.company || 'Company'}`, status: item.status || 'saved' }))),
    ...(interviewSessions.slice(0, 5).map((item) => ({ type: 'interview', createdAt: item.createdAt, title: item.role || 'Interview practice', status: item.type || 'session' }))),
    ...(resumeVersions.slice(0, 5).map((item) => ({ type: 'resume_version', createdAt: item.createdAt, title: item.targetRole || 'Tailored resume', status: 'generated' })))
  ].filter((item) => item.createdAt).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    summary: summarizeUserData(user, userData),
    metrics: {
      applications: applications.length,
      interviews: interviewSessions.length,
      followUps: applications.filter((item) => item.followUpDate).length,
      offers: applications.filter((item) => item.status === 'offer').length,
      atsScore: latestAts?.result?.score || latestAts?.result?.overallScore || null,
      resumeVersions: resumeVersions.length,
      uploadedResumes: resumes.length,
      ocrUploads: uploadItems.filter((item) => item.usedOcr).length
    },
    pipeline,
    extraction: {
      totalUploads: uploadItems.length,
      ocrUploads: uploadItems.filter((item) => item.usedOcr).length,
      byMode: extractionModes,
      latestMode: latestUpload?.extractionMode || null
    },
    latest: {
      careerPath: userData?.careerPath || null,
      latestUpload: latestUpload || null,
      latestAts: latestAts?.result || null,
      latestResumeVersion: resumeVersions[0] || null,
      latestInterview: interviewSessions[0] || null
    },
    missions: [
      latestUpload ? 'Run ATS comparison against a fresh job posting link.' : 'Upload your latest resume so the app can reuse real text across features.',
      applications.some((item) => item.status === 'interview') ? 'Practice one interview story for your active interviews.' : 'Add one active application and set a follow-up date.',
      userData?.careerPath ? 'Review your path and close the top visible skill gap.' : 'Generate a live career path using your profile and resume.'
    ],
    recentEvents
  };
}

module.exports = { buildDashboard };
