import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { useCachedJson } from '@/src/hooks/useCachedJson';
import { ATS_CHECK_CACHE_KEY, JOB_READY_PACKAGE_CACHE_KEY, RESUME_HISTORY_CACHE_KEY, RESUME_REWRITE_CACHE_KEY } from '@/src/features/resume/resume.cache';
import type { AtsCheckResponse, ResumeRewriteResponse } from '@/src/features/resume/resume.types';
import type { JobReadyPackage } from '@/src/features/resume/jobReady.types';
import { colors } from '@/src/constants/colors';

function LabStep({ step, title, detail }: { step: string; title: string; detail: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.primarySoft, fontWeight: '800' }}>{step}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>{detail}</Text>
      </View>
    </View>
  );
}

export default function ResumeScreen() {
  const { data: latestAts } = useCachedJson<AtsCheckResponse>(ATS_CHECK_CACHE_KEY);
  const { data: latestRewrite } = useCachedJson<ResumeRewriteResponse>(RESUME_REWRITE_CACHE_KEY);
  const { data: latestPackage } = useCachedJson<JobReadyPackage>(JOB_READY_PACKAGE_CACHE_KEY);
  const { data: history } = useCachedJson<{ targetRole?: string; score?: number; at: string }[]>(RESUME_HISTORY_CACHE_KEY);

  const topGaps = latestAts?.missingKeywords?.slice(0, 3) || [];
  const topRecommendations = latestAts?.recommendations?.slice(0, 3) || [];

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>Resume Match Lab</Text>
      <Text style={{ fontSize: 16, color: colors.muted, lineHeight: 24 }}>
        One guided flow: upload, compare, improve, export, and save the right version for each real opportunity.
      </Text>


      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Current match status</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label={latestAts ? `ATS ${latestAts.score}%` : 'ATS not run yet'} tone={latestAts?.score && latestAts.score >= 80 ? 'success' : latestAts?.score && latestAts.score >= 60 ? 'primary' : 'warning'} />
            <StatusChip label={latestRewrite ? 'Tailored version ready' : 'Tailored version pending'} tone={latestRewrite ? 'success' : 'warning'} />
            <StatusChip label={latestPackage ? 'Export package ready' : 'Export package pending'} tone={latestPackage ? 'success' : 'neutral'} />
            <StatusChip label={`${history?.length ?? 0} saved run${history?.length === 1 ? '' : 's'}`} tone="neutral" />
          </View>
          {topGaps.length ? (
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Top gaps to fix now</Text>
              {topGaps.map((item) => <Text key={item} style={{ color: colors.muted, lineHeight: 22 }}>• {item}</Text>)}
            </View>
          ) : null}
          {topRecommendations.length ? (
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Recommended next actions</Text>
              {topRecommendations.map((item) => <Text key={item} style={{ color: colors.muted, lineHeight: 22 }}>• {item}</Text>)}
            </View>
          ) : null}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Guided workflow</Text>
        <View style={{ marginTop: 14, gap: 14 }}>
          <LabStep step="1" title="Upload or paste your resume" detail="Start with your current base resume so the app works from real content instead of guesses." />
          <LabStep step="2" title="Add the job description" detail="Paste the job text or URL and check what the role truly asks for." />
          <LabStep step="3" title="Review the match score" detail="See the strongest signals, missing keywords, and risky weak spots first." />
          <LabStep step="4" title="Fix the highest-impact issues" detail="Rewrite summary, improve bullets, and strengthen role alignment before export." />
          <LabStep step="5" title="Export the right version" detail="Generate the tailored resume, cover letter, and recruiter email when needed." />
        </View>
      </AppCard>

      <AppButton label="Start with ATS comparison" onPress={() => router.push('/(app)/resume/ats-check')} />
      <AppButton label="Rewrite and improve resume" variant="secondary" onPress={() => router.push('/(app)/resume/rewrite')} />
      <AppButton label="Generate full job-ready package" variant="secondary" onPress={() => router.push('/(app)/resume/job-ready')} />
      <AppButton label="Open export center" variant="secondary" onPress={() => router.push('/(app)/resume/export-center')} />
      <AppButton label="Open saved library" variant="secondary" onPress={() => router.push('/(app)/resume/export-library')} />
    </AppScreen>
  );
}
