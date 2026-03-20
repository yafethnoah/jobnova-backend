export type LinkedInOptimizationResult = {
  url: string;
  headlineScore: number;
  aboutScore: number;
  keywordOverlap: string[];
  missingKeywords: string[];
  improvedHeadline: string;
  improvedAbout: string;
  featuredSuggestions: string[];
  skillsToAdd?: string[];
  contentIdeas?: string[];
  analyzedJobDescription?: string;
  analyzedFromUrl?: boolean;
  jobPostingTitle?: string;
};
