import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { LoadingView } from '@/src/components/ui/LoadingView';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useApplications } from '@/src/hooks/useApplications';
import { colors } from '@/src/constants/colors';
import type { ApplicationStatus, JobApplication } from '@/src/features/tracker/tracker.types';

const columns: { key: ApplicationStatus; title: string; tone: string }[] = [
  { key: 'saved', title: 'Saved', tone: colors.subtle },
  { key: 'applied', title: 'Applied', tone: colors.primarySoft },
  { key: 'interview', title: 'Interview', tone: colors.warning },
  { key: 'offer', title: 'Offer', tone: colors.success }
];

function CountTile({ label, value, tone = colors.text }: { label: string; value: number; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <AppCard>
        <Text style={{ color: colors.subtle, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
        <Text style={{ marginTop: 10, color: tone, fontSize: 26, fontWeight: '900' }}>{value}</Text>
      </AppCard>
    </View>
  );
}

function formatDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function smartReminder(item: JobApplication) {
  if (item.followUpDate) return `Follow-up: ${formatDate(item.followUpDate)}`;
  if (item.status === 'applied') return 'Next step: schedule a follow-up in 3–5 days.';
  if (item.status === 'interview') return 'Next step: review notes and confirm your interview plan.';
  if (item.status === 'offer') return 'Next step: capture your offer details and open the first 90 days plan.';
  return 'Next step: decide whether this role is worth applying to.';
}

function JobCard({ item }: { item: JobApplication }) {
  return (
    <Pressable onPress={() => router.push(`/(app)/tracker/${item.id}`)}>
      <AppCard>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{item.company}</Text>
        <Text style={{ marginTop: 4, color: colors.primarySoft, fontWeight: '700' }}>{item.role}</Text>
        <Text style={{ marginTop: 8, color: colors.muted }}>Stage: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
        <Text style={{ marginTop: 4, color: colors.muted }}>{smartReminder(item)}</Text>
        {item.notes ? <Text style={{ marginTop: 6, color: colors.subtle }} numberOfLines={2}>{item.notes}</Text> : null}
      </AppCard>
    </Pressable>
  );
}

export default function TrackerScreen() {
  const { data, isLoading, isError, error } = useApplications();

  if (isLoading) return <LoadingView label="Loading your applications..." />;

  const applications = data || [];
  const appliedCount = applications.filter((item) => item.status === 'applied').length;
  const interviewCount = applications.filter((item) => item.status === 'interview').length;
  const offerCount = applications.filter((item) => item.status === 'offer').length;
  const followUpCount = applications.filter((item) => Boolean(item.followUpDate)).length;

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>Tracker</Text>
      <Text style={{ color: colors.muted, lineHeight: 24 }}>
        Keep every opportunity in one place so the next move stays visible: save it, apply, prepare, follow up, and close the loop.
      </Text>
      <AppButton label="Add application" onPress={() => router.push('/(app)/tracker/add-application')} />

      {!isError && applications.length ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <CountTile label="Total" value={applications.length} />
            <CountTile label="Applied" value={appliedCount} tone={colors.primarySoft} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <CountTile label="Interviews" value={interviewCount} tone={colors.warning} />
            <CountTile label="Follow-up" value={followUpCount} tone={colors.subtle} />
          </View>
          {offerCount ? (
            <AppCard>
              <Text style={{ color: colors.success, fontWeight: '800', fontSize: 18 }}>Offer momentum</Text>
              <Text style={{ color: colors.muted, lineHeight: 22, marginTop: 8 }}>
                You have {offerCount} offer-stage application{offerCount === 1 ? '' : 's'}. Shift from job search mode to first-90-days preparation while the details are fresh.
              </Text>
              <View style={{ marginTop: 12 }}>
                <AppButton label="Open first 90 days plan" variant="secondary" onPress={() => router.push('/(app)/growth/first-90')} />
              </View>
            </AppCard>
          ) : null}
        </>
      ) : null}

      {isError ? <ErrorState title="Could not load applications" message={error instanceof Error ? error.message : 'Unknown error'} /> : null}
      {!isError && applications.length === 0 ? <EmptyState title="No applications yet" message="Start with one real target so the app can guide follow-up, interview preparation, and momentum." actionLabel="Add first application" onAction={() => router.push('/(app)/tracker/add-application')} /> : null}

      <View style={{ gap: 14 }}>
        {columns.map((column) => {
          const items = applications.filter((item) => item.status === column.key);
          return (
            <AppCard key={column.key}>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text }}>{column.title}</Text>
                  <Text style={{ color: column.tone, fontWeight: '800' }}>{items.length}</Text>
                </View>
                {items.length ? items.map((item) => <JobCard key={item.id} item={item} />) : <Text style={{ color: colors.subtle }}>No roles in this stage yet.</Text>}
              </View>
            </AppCard>
          );
        })}
      </View>
    </AppScreen>
  );
}
