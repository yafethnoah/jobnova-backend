import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { StatusChip } from '@/src/components/ui/StatusChip';
import { colors } from '@/src/constants/colors';
import { useAuth } from '@/src/features/auth/useAuth';
import { dashboardApi } from '@/src/api/dashboard';
import { useProfile } from '@/src/hooks/useProfile';

function MetricCard({ label, value, tone = colors.text }: { label: string; value: string | number; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <AppCard>
        <Text style={{ color: colors.subtle, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
        <Text style={{ marginTop: 10, color: tone, fontSize: 26, fontWeight: '900' }}>{value}</Text>
      </AppCard>
    </View>
  );
}

function JourneyProgress({ progress }: { progress: number }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Career journey progress</Text>
        <Text style={{ color: colors.primarySoft, fontWeight: '800' }}>{progress}%</Text>
      </View>
      <View style={{ height: 10, backgroundColor: colors.surfaceMuted, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <View style={{ width: `${Math.max(8, Math.min(progress, 100))}%`, height: '100%', backgroundColor: colors.primary }} />
      </View>
    </View>
  );
}

function TodayTask({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.primarySoft, fontWeight: '800' }}>•</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{title}</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>{detail}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { accessToken, user, signOut } = useAuth();
  const profile = useProfile();
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary(accessToken),
    refetchOnWindowFocus: false,
    refetchInterval: 30000
  });

  const data = summaryQuery.data;
  const atsScore = data?.metrics.atsScore ?? 0;
  const applications = data?.metrics.applications ?? 0;
  const interviews = data?.metrics.interviews ?? 0;
  const offers = data?.metrics.offers ?? 0;
  const isPostHireMode = offers > 0;
  const progress = Math.max(12, Math.min(96, Math.round(((applications * 14) + (interviews * 20) + (atsScore || 0) + (offers * 24)) / 3.1)));
  const stage = isPostHireMode
    ? 'Starting strong after your offer'
    : interviews > 0
      ? 'Preparing for interviews'
      : applications > 0
        ? 'Applying to jobs'
        : atsScore >= 60
          ? 'Improving resume match'
          : 'Building your job search foundation';

  const todayPlan = isPostHireMode
    ? [
        {
          title: 'Start your first 90 days plan',
          detail: 'Use your new momentum to prepare for onboarding, communication, and early wins.'
        },
        {
          title: 'Capture your offer details',
          detail: 'Keep role notes, salary details, start date, and questions together in one place.'
        },
        {
          title: 'Practice your first-week introduction',
          detail: 'Rehearse a confident, warm introduction so your first conversations feel easier.'
        }
      ]
    : [
        {
          title: atsScore >= 75 ? 'Tailor one role-specific version' : 'Improve your resume match score',
          detail: atsScore >= 75 ? 'Use Resume Match Lab to save a targeted version for one real job.' : 'Run ATS comparison and fix the top keyword or section gaps.'
        },
        {
          title: applications > 0 ? 'Review your active applications' : 'Create your first tracked application',
          detail: applications > 0 ? 'Keep follow-ups visible so no application goes quiet.' : 'Add one target company so the tracker can guide the next step.'
        },
        {
          title: interviews > 0 ? 'Rehearse your strongest examples' : 'Practice one interview round',
          detail: interviews > 0 ? 'Do one quick practice session before your next real conversation.' : 'Build confidence with a short structured or voice session.'
        }
      ];

  const primaryActionLabel = isPostHireMode
    ? 'Open my first 90 days plan'
    : 'Continue my journey';

  const primaryAction = () => router.push(
    isPostHireMode
      ? '/(app)/growth/first-90'
      : atsScore < 70
        ? '/(app)/resume/ats-check'
        : applications === 0
          ? '/(app)/tracker/add-application'
          : interviews === 0
            ? '/(app)/interview/live'
            : '/(app)/tracker/index'
  );

  return (
    <AppScreen>
      <AppCard>
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>Welcome back{profile.data?.fullName ? `, ${profile.data.fullName.split(' ')[0]}` : user?.email ? '' : ''}</Text>
          <Text style={{ color: colors.muted, lineHeight: 23 }}>
            {isPostHireMode
              ? 'You have offer-stage momentum. Keep the transition calm, organized, and focused on a strong start.'
              : 'JobNova is designed to keep your next move clear, simple, and focused on real momentum.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip label={stage} tone={isPostHireMode ? 'success' : 'primary'} />
            <StatusChip label={profile.data?.targetRole || 'Target role not set'} tone="neutral" />
            <StatusChip label={profile.data?.location || 'Location not set'} tone="neutral" />
          </View>
          <JourneyProgress progress={progress} />
          <AppButton label={primaryActionLabel} onPress={primaryAction} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Today’s plan</Text>
        <View style={{ marginTop: 14, gap: 14 }}>
          {todayPlan.map((item) => <TodayTask key={item.title} title={item.title} detail={item.detail} />)}
        </View>
      </AppCard>



      <AppCard>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Account</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>
            {user?.email ? `Signed in as ${user.email}` : 'You are currently signed out.'}
          </Text>
          <View style={{ gap: 10 }}>
            {user ? (
              <>
                <AppButton label="Edit profile" variant="secondary" onPress={() => router.push('/(app)/edit-profile')} />
                <AppButton label="Subscriptions" variant="secondary" onPress={() => router.push('/(app)/subscriptions')} />
                <AppButton label="Sign out" onPress={() => void signOut()} />
              </>
            ) : (
              <>
                <AppButton label="Sign in" onPress={() => router.push('/(public)/sign-in')} />
                <AppButton label="Sign up" variant="secondary" onPress={() => router.push('/(public)/sign-up')} />
              </>
            )}
          </View>
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MetricCard label="ATS" value={atsScore ? `${atsScore}%` : '—'} tone={atsScore >= 80 ? colors.success : atsScore >= 60 ? colors.primarySoft : colors.warning} />
        <MetricCard label="Applied" value={applications} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MetricCard label="Interview" value={interviews} tone={interviews > 0 ? colors.warning : colors.text} />
        <MetricCard label="Offer" value={offers} tone={offers > 0 ? colors.success : colors.text} />
      </View>

      <AppCard>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Next milestone</Text>
        <Text style={{ marginTop: 10, color: colors.muted, lineHeight: 22 }}>
          {isPostHireMode
            ? 'Shift from job search mode into first-90-days mode: prepare your introduction, organize your questions, and build early trust.'
            : atsScore < 70
              ? 'Strengthen your resume alignment so your applications start from a stronger base.'
              : applications === 0
                ? 'Turn your improved documents into visible momentum by tracking your first target application.'
                : interviews === 0
                  ? 'Use your active applications to practice job-specific answers before the next recruiter call arrives.'
                  : 'You are now in interview mode. Focus on confidence, stronger examples, and thoughtful follow-up.'}
        </Text>
        <View style={{ marginTop: 14, gap: 10 }}>
          <AppButton label={isPostHireMode ? 'Open first 90 days' : 'Open Path'} variant="secondary" onPress={() => router.push(isPostHireMode ? '/(app)/growth/first-90' : '/(app)/career-path')} />
          <AppButton label="Open Account & settings" variant="secondary" onPress={() => router.push('/(app)/settings')} />
        </View>
      </AppCard>
    </AppScreen>
  );
}
