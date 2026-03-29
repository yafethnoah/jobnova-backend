export type CareerPathResult = {
  primaryPath: { title: string; estimatedTimeline: string; steps: string[]; };
  bridgePath?: { title: string; steps: string[]; };
  regulatedWarning?: string;
  officialLinks: { title: string; url: string; }[];
  skillsToBuild?: string[];
  reasoning?: string;
};
