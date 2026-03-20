import { Image, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { colors } from '@/src/constants/colors';
import { useAuth } from '@/src/features/auth/useAuth';
import { dashboardApi } from '@/src/api/dashboard';
import { healthApi } from '@/src/api/health';
import { useAutopilotPackages } from '@/src/hooks/useAutopilotPackages';

function StatTile({ label, value, tone = colors.text }: { label: string; value: string | number; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <AppCard>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ marginTop: 10, fontSize: 28, fontWeight: '900', color: tone }}>{value}</Text>
      </AppCard>
    </View>
  );
}

function getHealthTone(status?: 'healthy' | 'degraded' | 'fallback' | 'down'): 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'healthy') return 'success';
  if (status === 'degraded' || status === 'fallback') return 'warning';
  if (status === 'down') return 'danger';
  return 'primary';
}

export default function HomeScreen() {
  const { accessToken, user } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary(accessToken),
    refetchOnWindowFocus: false,
    refetchInterval: 30000
  });
  const packagesQuery = useAutopilotPackages();
  const healthQuery = useQuery({
    queryKey: ['backend-health'],
    queryFn: () => healthApi.getBackendHealth(),
    refetchOnWindowFocus: false,
    refetchInterval: 60000
  });

  const data = summaryQuery.data;
  const packageItems = packagesQuery.data?.items || [];
  const backendStatus = healthQuery.data?.status || data?.backendStatus || (healthQuery.isLoading ? 'fallback' : 'down');
  const score = data?.metrics.atsScore ?? '--';
  const applications = data?.metrics.applications ?? 0;
  const followUps = data?.metrics.followUps ?? 0;
  const interviews = data?.metrics.interviews ?? 0;
  const liveMissions = data?.missions || [];
  const pipelineEntries = Object.entries(data?.pipeline || {});
  const extractionEntries = Object.entries(data?.extraction?.byMode || {});

  return (
    <AppScreen>
      <AppCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Image source={require('../../assets/icon.png')} style={{ width: 64, height: 64, borderRadius: 18 }} resizeMode="contain" />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text }}>Career cockpit</Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: colors.muted }}>
              Welcome back{user?.email ? `, ${user.email}` : ''}. Your next best move should always be visible in one glance.
            </Text>
          </View>
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile label="ATS score" value={score} tone={typeof score === 'number' && score >= 80 ? colors.success : colors.text} />
        <StatTile label="Applications" value={applications} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatTile label="Follow-ups" value={followUps} tone={followUps > 0 ? colors.warning : colors.text} />
        <StatTile label="Interviews" value={interviews} />
      </View>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Today’s focus</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>Use this as a guided sequence instead of jumping randomly between tools.</Text>
          <Text style={{ color: colors.text }}>1. Check your fit against the role.</Text>
          <Text style={{ color: colors.text }}>2. Generate the tailored package.</Text>
          <Text style={{ color: colors.text }}>3. Practice the interview.</Text>
          <Text style={{ color: colors.text }}>4. Track the application and follow-up.</Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Quick actions</Text>
        <View style={{ marginTop: 14, gap: 10 }}>
          <AppButton label="Run ATS comparison" onPress={() => router.push('/(app)/resume/ats-check')} />
          <AppButton label="Generate job-ready package" variant="secondary" onPress={() => router.push('/(app)/resume/job-ready')} />
          <AppButton label="Start voice interview training" variant="secondary" onPress={() => router.push('/(app)/interview/live-lobby')} />
          <AppButton label="Open job tracker" variant="secondary" onPress={() => router.push('/(app)/tracker')} />
          <AppButton label="Open settings and profile" variant="secondary" onPress={() => router.push('/(app)/settings')} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Recruiter package pipeline</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label={`${packageItems.filter((item) => item.status !== 'approved').length} drafts`} tone="warning" />
            <StatusChip label={`${packageItems.filter((item) => item.status === 'approved').length} approved`} tone="success" />
            <StatusChip label={`${packageItems.filter((item) => item.linkedExportJobId).length} exports linked`} tone="primary" />
          </View>
          <AppButton label="Open apply dashboard" variant="secondary" onPress={() => router.push('/(app)/applications/apply-dashboard')} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Live mission queue</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {liveMissions.length ? liveMissions.map((item, index) => (
            <Text key={`${item}-${index}`} style={{ color: colors.muted, lineHeight: 22 }}>{index + 1}. {item}</Text>
          )) : <Text style={{ color: colors.muted }}>No live mission data yet.</Text>}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Pipeline snapshot</Text>
        <View style={{ marginTop: 12, gap: 8 }}>
          {pipelineEntries.length ? pipelineEntries.map(([key, value]) => (
            <Text key={key} style={{ color: colors.muted }}>{key}: {String(value)}</Text>
          )) : <Text style={{ color: colors.muted }}>No pipeline data yet.</Text>}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Extraction intelligence</Text>
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={{ color: colors.muted }}>OCR-assisted uploads: {String(data?.metrics.ocrUploads ?? 0)}</Text>
          <Text style={{ color: colors.muted }}>Latest extraction mode: {data?.extraction?.latestMode || 'none yet'}</Text>
          {extractionEntries.length ? extractionEntries.map(([key, value]) => (
            <Text key={key} style={{ color: colors.muted }}>{key}: {String(value)}</Text>
          )) : <Text style={{ color: colors.muted }}>No extraction data yet.</Text>}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>System status</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label={backendStatus || 'unknown'} tone={getHealthTone(backendStatus)} />
            <StatusChip label={`db: ${healthQuery.data?.db?.mode || data?.runtimeMode || 'unknown'}`} tone={healthQuery.data?.db?.ok ? 'success' : backendStatus === 'down' ? 'danger' : 'warning'} />
            <StatusChip label={`redis: ${healthQuery.data?.redis?.mode || data?.queueMode || 'unknown'}`} tone={healthQuery.data?.redis?.ok ? 'success' : backendStatus === 'down' ? 'danger' : 'warning'} />
            <StatusChip label={`supabase: ${healthQuery.data?.supabase?.mode || 'not-configured'}`} tone={healthQuery.data?.supabase?.ok ? 'success' : 'warning'} />
          </View>
          {healthQuery.data?.openai?.mode ? (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <StatusChip label={`ai: ${healthQuery.data.openai.mode}`} tone={healthQuery.data.openai.ok ? 'success' : 'warning'} />
              <StatusChip label={`exports: ${healthQuery.data?.exports?.mode || 'unknown'}`} tone={healthQuery.data?.exports?.ok ? 'success' : 'warning'} />
            </View>
          ) : null}
          <Text style={{ color: colors.muted, lineHeight: 22 }}>
            {healthQuery.isLoading
              ? 'Checking backend health...'
              : healthQuery.error instanceof Error
                ? healthQuery.error.message
                : backendStatus === 'healthy'
                  ? `Backend ${healthQuery.data?.version || 'unknown'} is healthy and ready for production testing.`
                  : backendStatus === 'degraded'
                    ? 'The backend is reachable, but one or more supporting services are degraded.'
                    : backendStatus === 'fallback'
                      ? 'The backend is running in fallback mode. Core flows remain available, but live fidelity is reduced.'
                      : backendStatus === 'down'
                        ? 'The backend is down or missing a required dependency.'
                        : `Backend ${healthQuery.data?.version || 'unknown'} responded, but its runtime state is unclear.`}
          </Text>
        </View>
      </AppCard>
    </AppScreen>
  );
}
