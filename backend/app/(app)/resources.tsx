import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { LoadingView } from '@/src/components/ui/LoadingView';
import { useAuth } from '@/src/features/auth/useAuth';
import { resourcesApi } from '@/src/api/resources';
import { openExternalLink } from '@/src/lib/openExternalLink';
import { colors } from '@/src/constants/colors';

export default function ResourcesScreen() {
  const { accessToken, status } = useAuth();
  const query = useQuery({
    queryKey: ['resources'],
    queryFn: () => resourcesApi.list(accessToken),
    enabled: status === 'signed_in' && Boolean(accessToken)
  });

  const grouped = useMemo(() => {
    const items = query.data || [];
    return {
      licensing: items.filter((item) => /license|credential|regulat/i.test(item.category + item.title + item.description)),
      resume: items.filter((item) => /resume|interview|career|employment/i.test(item.category + item.title + item.description)),
      newcomer: items.filter((item) => /newcomer|settlement|language|community/i.test(item.category + item.title + item.description)),
      quick: items.filter((item) => /job|work|training|search/i.test(item.category + item.title + item.description)).slice(0, 5)
    };
  }, [query.data]);

  if (query.isLoading) return <LoadingView label="Loading resources..." />;

  const sections = [
    { key: 'licensing', title: 'Licensing & certifications', items: grouped.licensing },
    { key: 'resume', title: 'Resume & interview help', items: grouped.resume },
    { key: 'newcomer', title: 'Newcomer & language support', items: grouped.newcomer },
    { key: 'quick', title: 'Quick job search help', items: grouped.quick }
  ];

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>Resources</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted }}>
        Practical support grouped by need, with official services and trustworthy next steps first.
      </Text>
      {query.isError ? <ErrorState title="Could not load resources" message={query.error instanceof Error ? query.error.message : 'Unknown error'} /> : null}
      <View style={{ gap: 12 }}>
        {sections.map((section) => (
          <AppCard key={section.key}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{section.title}</Text>
            <View style={{ marginTop: 12, gap: 12 }}>
              {section.items.length ? section.items.map((item) => (
                <View key={item.id} style={{ gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.title}</Text>
                  <Text style={{ color: colors.muted, lineHeight: 22 }}>{item.description}</Text>
                  <Text style={{ color: colors.subtle }}>{item.official ? 'Official resource' : item.category}</Text>
                  <AppButton
                    label={item.url ? "Open resource" : "Link unavailable"}
                    variant="secondary"
                    onPress={() => { if (item.url) void openExternalLink(item.url); }}
                    disabled={!item.url}
                  />
                </View>
              )) : <Text style={{ color: colors.subtle }}>No resources in this section yet.</Text>}
            </View>
          </AppCard>
        ))}
      </View>
    </AppScreen>
  );
}
