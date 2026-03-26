import { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { useCachedJson } from '@/src/hooks/useCachedJson';
import { JOB_READY_PACKAGE_CACHE_KEY } from '@/src/features/resume/resume.cache';
import { coverLetterTemplates, resumeTemplates } from '@/src/features/resume/resumeTemplates';
import type { DocumentTemplate, JobReadyPackage, LayoutMode, ResumeThemeId } from '@/src/features/resume/jobReady.types';
import { saveJson } from '@/src/lib/localCache';

const layoutModes: { id: LayoutMode; name: string; blurb: string }[] = [
  { id: 'one-page', name: 'True one-page ATS layout', blurb: 'Tighter spacing and stricter section density for concise direct-fit applications.' },
  { id: 'two-page', name: 'True two-page ATS layout', blurb: 'More breathing room for deeper experience, leadership context, and selected detail.' }
];

const resumeThemes: { id: ResumeThemeId; name: string; blurb: string }[] = [
  { id: 'modern-minimal', name: 'Modern Minimal', blurb: 'Sleek, contemporary, clean, and restrained.' },
  { id: 'classic-canadian-professional', name: 'Classic Canadian Professional', blurb: 'Conservative, trusted, recruiter-friendly Canadian business style.' },
  { id: 'executive-clean', name: 'Executive Clean', blurb: 'Sharper hierarchy for leadership and senior-level positioning.' },
  { id: 'nonprofit-academic-friendly', name: 'Nonprofit / Academic Friendly', blurb: 'Mission-aware, service-centered, and better for education or nonprofit storytelling.' }
];

export default function DesignStudioScreen() {
  const { data } = useCachedJson<JobReadyPackage>(JOB_READY_PACKAGE_CACHE_KEY);
  const [resumeTemplateId, setResumeTemplateId] = useState(data?.selectedResumeTemplateId || data?.recommendedResumeTemplateId || 'classic-canadian-professional');
  const [coverTemplateId, setCoverTemplateId] = useState(data?.selectedCoverLetterTemplateId || data?.recommendedCoverLetterTemplateId || 'canadian-standard-letter');
  const [resumeThemeId, setResumeThemeId] = useState(data?.selectedResumeThemeId || 'classic-canadian-professional');
  const [layoutMode, setLayoutMode] = useState(data?.selectedLayoutMode || 'one-page');

  async function saveSelection() {
    if (!data) return;
    await saveJson(JOB_READY_PACKAGE_CACHE_KEY, {
      ...data,
      selectedResumeTemplateId: resumeTemplateId,
      selectedCoverLetterTemplateId: coverTemplateId,
      selectedResumeThemeId: resumeThemeId,
      selectedLayoutMode: layoutMode
    });
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Design & export studio</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Choose a recruiter-grade document theme and true ATS layout mode. This version changes the actual render style, not just the content wearing a different hat.
      </Text>

      <SelectionSection title="Resume theme" items={resumeThemes} selectedId={resumeThemeId} onSelect={setResumeThemeId} />
      <SelectionSection title="ATS layout mode" items={layoutModes} selectedId={layoutMode} onSelect={setLayoutMode} />

      <Section
        title="Resume design"
        items={resumeTemplates}
        selectedId={resumeTemplateId}
        onSelect={setResumeTemplateId}
      />

      <Section
        title="Cover letter design"
        items={coverLetterTemplates}
        selectedId={coverTemplateId}
        onSelect={setCoverTemplateId}
      />

      <AppButton label="Save design choices" onPress={() => void saveSelection()} disabled={!data} />
    </AppScreen>
  );
}

function SelectionSection({ title, items, selectedId, onSelect }: { title: string; items: { id: string; name: string; blurb: string }[]; selectedId: string; onSelect: (value: any) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>{title}</Text>
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <AppCard key={item.id}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>{item.name}</Text>
              <Text style={{ color: '#96A7DE', lineHeight: 22 }}>{item.blurb}</Text>
              <AppButton label={selected ? 'Selected' : 'Choose this option'} variant={selected ? 'primary' : 'secondary'} onPress={() => onSelect(item.id)} />
            </View>
          </AppCard>
        );
      })}
    </View>
  );
}

function Section({ title, items, selectedId, onSelect }: { title: string; items: DocumentTemplate[]; selectedId: string; onSelect: (value: string) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>{title}</Text>
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <AppCard key={item.id}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>{item.name}</Text>
              <Text style={{ color: '#C8D3F5' }}>Best for: {item.bestFor}</Text>
              <Text style={{ color: '#C8D3F5' }}>Badge: {item.atsSafety}</Text>
              <Text style={{ color: '#96A7DE', lineHeight: 22 }}>{item.description}</Text>
              <AppButton label={selected ? 'Selected' : 'Choose this design'} variant={selected ? 'primary' : 'secondary'} onPress={() => onSelect(item.id)} />
            </View>
          </AppCard>
        );
      })}
    </View>
  );
}
