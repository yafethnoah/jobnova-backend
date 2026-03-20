import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { linkedinApi } from '@/src/api/linkedin';
import { useAuth } from '@/src/features/auth/useAuth';
import { getJson, saveJson } from '@/src/lib/localCache';
import { LINKEDIN_OPTIMIZATION_CACHE_KEY } from '@/src/features/profile/linkedin.cache';
import { LATEST_RESUME_TEXT_CACHE_KEY } from '@/src/features/resume/resume.cache';
import type { LinkedInOptimizationResult } from '@/src/features/profile/linkedin.types';


function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\r?\n|,|•/).map((item) => item.trim()).filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map((item) => String(item).trim()).filter(Boolean);
  return [];
}

export default function LinkedInScreen() {
  const { accessToken } = useAuth();
  const [url, setUrl] = useState('https://www.linkedin.com/in/example');
  const [targetRole, setTargetRole] = useState('Placement Coordinator');
  const [jobDescription, setJobDescription] = useState('Employer outreach, student placements, relationship-building, documentation, and career support.');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [resumeText, setResumeText] = useState('');

  useEffect(() => {
    void (async () => {
      const cached = await getJson<string>(LATEST_RESUME_TEXT_CACHE_KEY);
      if (cached?.trim()) setResumeText(cached.trim());
    })();
  }, []);

  const mutation = useMutation({
    mutationFn: () => linkedinApi.optimize(accessToken, { url: url.trim(), targetRole: targetRole.trim() || undefined, jobDescription: jobDescription.trim() || undefined, jobPostingUrl: jobPostingUrl.trim() || undefined, resumeText: resumeText.trim() || undefined }),
    onSuccess: async (data) => saveJson(LINKEDIN_OPTIMIZATION_CACHE_KEY, data)
  });

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>LinkedIn optimizer</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        In live mode this can optimize your LinkedIn headline and About section using your attached resume text plus a pasted description or a real job posting link. If you add a link, JobNova will try to extract the posting text automatically.
      </Text>
      <AppCard>
        <View style={{ gap: 14 }}>
          <AppInput label="LinkedIn URL" value={url} onChangeText={setUrl} autoCapitalize="none" />
          <AppInput label="Target role" value={targetRole} onChangeText={setTargetRole} />
          <AppInput label="Job posting link" value={jobPostingUrl} onChangeText={setJobPostingUrl} placeholder="https://company.com/jobs/role" autoCapitalize="none" keyboardType="url" />
          <AppInput label="Job description or extra notes" value={jobDescription} onChangeText={setJobDescription} multiline placeholder="Paste the description only if the job link is missing details" />
          <AppInput label="Resume text (auto-filled from attached resume if available)" value={resumeText} onChangeText={setResumeText} multiline />
          <AppButton label={mutation.isPending ? 'Optimizing...' : 'Run LinkedIn optimization'} onPress={() => mutation.mutate()} disabled={mutation.isPending || !url.trim()} />
        </View>
      </AppCard>
      {mutation.isError ? <ErrorState title="Could not optimize LinkedIn" message={mutation.error instanceof Error ? mutation.error.message : 'Unknown error'} /> : null}
      {mutation.data ? <LinkedInResults data={mutation.data} /> : null}
    </AppScreen>
  );
}

function LinkedInResults({ data }: { data: LinkedInOptimizationResult }) {
  return (
    <>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Scores</Text>
        {data.analyzedFromUrl ? <Text style={{ marginTop: 8, color: '#96A7DE' }}>Analyzed from live job posting{data.jobPostingTitle ? `: ${data.jobPostingTitle}` : ''}</Text> : null}
        <View style={{ marginTop: 10, gap: 8 }}>
          <Text style={{ color: '#C8D3F5' }}>Headline score: {data.headlineScore}/100</Text>
          <Text style={{ color: '#C8D3F5' }}>About score: {data.aboutScore}/100</Text>
        </View>
      </AppCard>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Keyword overlap</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{stringList(data.keywordOverlap).join(', ') || 'No major overlap detected yet.'}</Text>
      </AppCard>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Improved headline</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{data.improvedHeadline}</Text>
        <Text style={{ marginTop: 14, fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Improved About</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{data.improvedAbout}</Text>
      </AppCard>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Featured suggestions</Text>
        <View style={{ marginTop: 10, gap: 8 }}>{data.featuredSuggestions.map((item, index) => <Text key={index} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>)}</View>
        {data.skillsToAdd?.length ? <><Text style={{ marginTop: 14, fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Skills to add</Text><View style={{ marginTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{data.skillsToAdd.map((item) => <View key={item} style={{ backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: '#3730A3', fontWeight: '600' }}>{item}</Text></View>)}</View></> : null}
      </AppCard>
      {data.contentIdeas?.length ? <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Content ideas</Text><View style={{ marginTop: 10, gap: 8 }}>{data.contentIdeas.map((item, index) => <Text key={index} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>)}</View></AppCard> : null}
    </>
  );
}
