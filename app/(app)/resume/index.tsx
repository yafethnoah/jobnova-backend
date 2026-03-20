import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { useCachedJson } from '@/src/hooks/useCachedJson';
import { ATS_CHECK_CACHE_KEY, JOB_READY_PACKAGE_CACHE_KEY, RESUME_HISTORY_CACHE_KEY, RESUME_REWRITE_CACHE_KEY } from '@/src/features/resume/resume.cache';
import type { AtsCheckResponse, ResumeRewriteResponse } from '@/src/features/resume/resume.types';
import type { JobReadyPackage } from '@/src/features/resume/jobReady.types';
import { colors } from '@/src/constants/colors';

function StepRow({ step, title, detail }: { step: string; title: string; detail: string }) {
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
  const { data: history } = useCachedJson<Array<{ targetRole?: string; score?: number; at: string }>>(RESUME_HISTORY_CACHE_KEY);

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Resume Match Lab</Text>
      <Text style={{ fontSize: 16, color: '#96A7DE', lineHeight: 24 }}>
        V12 turns this section into one guided flow: assess the role, tailor the content, package it, design it, and export it.
      </Text>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Current status</Text>
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={{ color: '#C8D3F5' }}>ATS score: {latestAts ? `${latestAts.score}/100` : 'Not run yet'}</Text>
          <Text style={{ color: '#C8D3F5' }}>Tailored rewrite: {latestRewrite ? 'Ready' : 'Not generated yet'}</Text>
          <Text style={{ color: '#C8D3F5' }}>Job-ready package: {latestPackage ? 'Ready' : 'Not generated yet'}</Text>
          <Text style={{ color: '#C8D3F5' }}>Selected resume theme: {latestPackage?.selectedResumeThemeId ?? 'Not selected yet'}</Text>
          <Text style={{ color: '#C8D3F5' }}>Selected layout: {latestPackage?.selectedLayoutMode ?? 'one-page'}</Text>
          <Text style={{ color: '#C8D3F5' }}>Saved resume lab runs: {history?.length ?? 0}</Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Recommended sequence</Text>
        <View style={{ marginTop: 14, gap: 14 }}>
          <StepRow step="1" title="Run ATS comparison" detail="Check match quality and surface the missing keywords, experience signals, and section gaps." />
          <StepRow step="2" title="Tailor the resume" detail="Generate the rewritten resume so the content aligns to the target role before export." />
          <StepRow step="3" title="Generate the package" detail="Create the resume, cover letter, recruiter email, and supporting outputs in one pass." />
          <StepRow step="4" title="Choose the design" detail="Apply the right theme and layout style for the role, sector, and recruiter expectation." />
          <StepRow step="5" title="Export" detail="Generate Word, PDF, or both depending on the delivery channel and user preference." />
          <StepRow step="6" title="Save and reuse" detail="Store the finished outputs so the user can revisit and resend them quickly." />
        </View>
      </AppCard>

      <AppButton label="Run ATS comparison" onPress={() => router.push('/(app)/resume/ats-check')} />
      <AppButton label="Tailor full resume" variant="secondary" onPress={() => router.push('/(app)/resume/rewrite')} />
      <AppButton label="Generate job-ready package" variant="secondary" onPress={() => router.push('/(app)/resume/job-ready')} />
      <AppButton label="Choose design templates" variant="secondary" onPress={() => router.push('/(app)/resume/design-studio')} />
      <AppButton label="Open export center" variant="secondary" onPress={() => router.push('/(app)/resume/export-center')} />
      <AppButton label="Open saved export library" variant="secondary" onPress={() => router.push('/(app)/resume/export-library')} />
    </AppScreen>
  );
}
