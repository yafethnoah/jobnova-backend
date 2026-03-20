import type { JobApplication } from "@/src/features/tracker/tracker.types";
import type { ResourceItem } from "@/src/features/resources/resources.types";
import type { UserProfile } from "@/src/features/profile/profile.types";
import type { ResumeRewriteResponse, AtsCheckResponse } from "@/src/features/resume/resume.types";
import type { InterviewFeedbackResponse, InterviewQuestionResponse } from "@/src/features/interview/interview.types";
import type { CareerPathResult } from "@/src/features/career-path/careerPath.types";

export let mockApplications: JobApplication[] = [
  { id: "app-1", company: "RBC", role: "HR Coordinator", status: "applied", followUpDate: "2026-03-18", notes: "Applied through company portal" },
  { id: "app-2", company: "Sheridan College", role: "People & Culture Assistant", status: "saved", notes: "Need tailored resume version" }
];

export let mockProfile: UserProfile = { id: "user-1", email: "you@example.com", fullName: "Shadi", targetRole: "HR Coordinator", location: "Mississauga, ON", summary: "Internationally experienced professional building a stable HR path in Canada.", onboardingCompleted: true };

export const mockResources: ResourceItem[] = [
  { id: "res-1", title: "Employment Ontario", description: "Employment services, training, job support, and local programs.", url: "https://www.ontario.ca/page/employment-ontario", category: "Employment", official: true },
  { id: "res-2", title: "Job Bank", description: "Canadian job postings, career planning, and labour market information.", url: "https://www.jobbank.gc.ca/home", category: "Jobs", official: true },
  { id: "res-3", title: "Credential Recognition in Ontario", description: "Support for internationally trained professionals and regulated occupations.", url: "https://www.ontario.ca/page/ontario-bridge-training-program", category: "Credentials", official: true }
];

export const mockCareerPath: CareerPathResult = { primaryPath: { title: "HR Coordinator to HR Generalist", estimatedTimeline: "6 to 18 months", steps: ["Tailor resume for bridge and coordinator roles", "Apply to 5–10 targeted roles weekly", "Build local HR systems vocabulary", "Prepare STAR-format interview answers"] }, bridgePath: { title: "Administrative and People Operations Roles", steps: ["Target admin roles with HR-adjacent duties", "Gain Canadian workplace references", "Shift into formal HR roles once local experience is built"] }, regulatedWarning: "Some professions require credential recognition or licensure before full practice.", officialLinks: [{ title: "Employment Ontario", url: "https://www.ontario.ca/page/employment-ontario" }] };

export const mockRewriteResult: ResumeRewriteResponse = { summary: "Your resume now uses clearer action language and stronger alignment with Canadian HR coordinator roles.", improvedBullets: ["Coordinated recruitment scheduling and candidate communication across multiple hiring streams.", "Maintained employee records and supported onboarding documentation with accuracy and confidentiality.", "Collaborated with managers to improve interview logistics and candidate experience."], rewrittenResume: "Rewritten resume content appears here in improved, ATS-friendly language." };

export const mockAtsResult: AtsCheckResponse = { score: 82, strengths: ["Clear professional direction", "Good action verbs", "Relevant HR keywords present"], gaps: ["Needs more measurable achievements", "Could align more closely to target role titles"], recommendations: ["Add metrics where possible", "Mirror wording from the job posting", "Strengthen summary section"] };

export const mockInterviewQuestion: InterviewQuestionResponse = { role: "HR Coordinator", question: "Tell me about a time you had to manage competing priorities while supporting multiple stakeholders." };

export const mockInterviewFeedback: InterviewFeedbackResponse = { clarity: 8, structure: 7, relevance: 8, strength: "Your answer shows professionalism and stakeholder awareness.", improvements: ["Add a clearer STAR structure", "State the final result more explicitly", "Include a measurable impact if possible"], strongerSampleAnswer: "In a previous role, I supported several urgent requests at the same time, including onboarding, scheduling, and documentation. I prioritized tasks by deadline and business impact, kept stakeholders updated, and completed the most time-sensitive items first. As a result, onboarding stayed on schedule and managers received the information they needed without delays." };
