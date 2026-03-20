import { apiRequest } from "@/src/api/client";
import { env } from "@/src/lib/env";

export type AtsCompareInput = {
  resumeText: string;
  jobDescription: string;
  targetRole?: string;
  companyName?: string;
};

export type AtsCompareRecord = {
  id: string;
  createdAt: string;
  input: {
    targetRole?: string;
    companyName?: string;
  };
  result: {
    overallScore: number;
    keywordScore: number;
    skillsScore: number;
    titleScore: number;
    experienceScore: number;
    formattingScore: number;
    seniorityScore: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    formattingRisks: string[];
    weakPhrases: string[];
    recruiterConcerns: string[];
    topImprovements: string[];
    roleSummary: string;
    sourceMode: string;
  };
};

export type TailoredRewriteRecord = {
  id: string;
  createdAt: string;
  targetRole?: string;
  companyName?: string;
  result: {
    summary: string;
    improvedBullets: string[];
    optimizedSkills: string[];
    priorityKeywords?: string[];
    roleAlignmentNotes?: string[];
    rewrittenResume: string;
    truthGuardNote: string;
    truthGuard: {
      safeToUse: boolean;
      flaggedClaims: string[];
      reason: string;
    };
    ats: AtsCompareRecord["result"];
  };
};

export type ApplicationPackageRecord = {
  id: string;
  createdAt: string;
  targetRole?: string;
  companyName?: string;
  result: {
    ats: AtsCompareRecord["result"];
    tailoredResume: TailoredRewriteRecord["result"];
    coverLetter: string;
    recruiterEmail: string;
    followUpPlan: {
      firstFollowUpDays: number;
      secondFollowUpDays: number;
      actions: string[];
    };
  };
};

export const atsApi = {
  compare(token: string | null, input: AtsCompareInput) {
    return apiRequest<AtsCompareRecord>("/ats/compare", { method: "POST", token, body: input });
  },
  rewrite(token: string | null, input: AtsCompareInput) {
    return apiRequest<TailoredRewriteRecord>("/ats/rewrite", { method: "POST", token, body: input });
  },
  buildPackage(token: string | null, input: AtsCompareInput & { fullName?: string }) {
    return apiRequest<ApplicationPackageRecord>("/ats/package", { method: "POST", token, body: input });
  },
  history(token: string | null) {
    return apiRequest<{ atsResults: AtsCompareRecord[]; autopilotPackages: ApplicationPackageRecord[] }>("/ats/history", { token });
  }
};
