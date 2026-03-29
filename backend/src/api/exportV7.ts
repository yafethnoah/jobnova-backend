import { apiRequest } from "@/src/api/client";

export type ExportBundleInput = {
  targetRole: string;
  companyName?: string;
  resumeText: string;
  jobDescription: string;
  fullName?: string;
  theme?: string;
  layout?: "one-page" | "two-page";
  exportType?: "docx" | "pdf" | "both";
};

export type ExportBundleResponse = {
  id: string;
  createdAt: string;
  targetRole?: string;
  companyName?: string;
  config: {
    theme: string;
    layout: string;
    exportType: string;
  };
  files: {
    label: string;
    type: string;
    format: string;
    fileName: string;
    url: string;
  }[];
  packageResult: unknown;
};

export const exportV7Api = {
  create(token: string | null, input: ExportBundleInput) {
    return apiRequest<ExportBundleResponse>("/exports/resume", {
      method: "POST",
      token,
      body: {
        targetRole: input.targetRole,
        companyName: input.companyName,
        resumeText: input.resumeText,
        jobDescription: input.jobDescription,
        fullName: input.fullName,
        resumeThemeId: input.theme,
        layoutMode: input.layout,
        selectedExportFormat: input.exportType
      }
    });
  },
  library(token: string | null) {
    return apiRequest<ExportBundleResponse[]>("/exports/library", { token });
  }
};
