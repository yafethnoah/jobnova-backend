import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';

type StepFeedback = {
  clarity: number;
  structure: number;
  relevance: number;
  strength: string;
  improvements: string[];
  strongerSampleAnswer: string;
  question: string;
  answer: string;
  index: number;
};

export default function InterviewFeedbackScreen() {
  const params = useLocalSearchParams<{ role?: string; average?: string; feedbacks?: string }>();
  const feedbacks: StepFeedback[] = params.feedbacks ? JSON.parse(params.feedbacks) : [];
  const [activeArea, setActiveArea] = useState<'overview' | 'clarity' | 'structure' | 'relevance' | 'improve'>('overview');
  const areaTotals = feedbacks.reduce((acc, item) => ({
    clarity: acc.clarity + item.clarity,
    structure: acc.structure + item.structure,
    relevance: acc.relevance + item.relevance
  }), { clarity: 0, structure: 0, relevance: 0 });
  const strongestArea = feedbacks.length ? (Object.entries(areaTotals).sort((a, b) => a[1] - b[1]).pop()?.[0] ?? null) : null;

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Interview feedback</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#C8D3F5' }}>
        Voice session summary with role-specific coaching for your next rehearsal.
      </Text>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Session snapshot</Text>
        <Text style={{ marginTop: 10, fontSize: 32, fontWeight: '800', color: '#FFFFFF' }}>{params.average ?? '0'}/10</Text>
        <Text style={{ marginTop: 10, color: '#C8D3F5', lineHeight: 24 }}>
          Role practiced: {params.role ?? 'Unknown role'}
        </Text>
        <Text style={{ marginTop: 6, color: '#C8D3F5', lineHeight: 24 }}>
          Strongest area: {strongestArea ? strongestArea.charAt(0).toUpperCase() + strongestArea.slice(1) : 'Not enough data yet'}.
        </Text>
      </AppCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'clarity', label: 'Clarity' },
          { key: 'structure', label: 'Structure' },
          { key: 'relevance', label: 'Relevance' },
          { key: 'improve', label: 'Improve' }
        ].map((item) => {
          const selected = activeArea === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setActiveArea(item.key as typeof activeArea)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selected ? '#6F86FF' : '#27385F',
                backgroundColor: selected ? '#6F86FF' : pressed ? '#172644' : '#111C33'
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {feedbacks.map((item) => (
        <AppCard key={`${item.index}-${item.question}`}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Question {item.index + 1}</Text>
          <Text style={{ marginTop: 8, color: '#FFFFFF', lineHeight: 24 }}>{item.question}</Text>

          {(activeArea === 'overview' || activeArea === 'clarity') ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: '#C8D3F5', fontWeight: '700' }}>Clarity</Text>
              <Text style={{ color: '#C8D3F5', lineHeight: 24 }}>Score: {item.clarity}/10</Text>
              <Text style={{ color: '#C8D3F5', lineHeight: 24 }}>{item.strength}</Text>
            </View>
          ) : null}

          {(activeArea === 'overview' || activeArea === 'structure') ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: '#C8D3F5', fontWeight: '700' }}>Structure</Text>
              <Text style={{ color: '#C8D3F5', lineHeight: 24 }}>Score: {item.structure}/10</Text>
              <Text style={{ color: '#C8D3F5', lineHeight: 24 }}>Use tighter STAR framing: one line for situation, one for task, one for action, and one for result.</Text>
            </View>
          ) : null}

          {(activeArea === 'overview' || activeArea === 'relevance') ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: '#C8D3F5', fontWeight: '700' }}>Relevance</Text>
              <Text style={{ color: '#C8D3F5', lineHeight: 24 }}>Score: {item.relevance}/10</Text>
              <Text style={{ color: '#C8D3F5', lineHeight: 24 }}>Connect your answer back to the role with one explicit sentence about why the example matters here.</Text>
            </View>
          ) : null}

          {(activeArea === 'overview' || activeArea === 'improve') ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: '#C8D3F5', fontWeight: '700' }}>Improve</Text>
              {item.improvements.map((improvement, idx) => (
                <Text key={`${idx}-${improvement}`} style={{ color: '#C8D3F5', lineHeight: 24 }}>
                  • {improvement}
                </Text>
              ))}
              {item.strongerSampleAnswer ? (
                <Text style={{ color: '#FFFFFF', lineHeight: 24 }}>Suggested improved answer is ready for the next rehearsal pass.</Text>
              ) : null}
            </View>
          ) : null}
        </AppCard>
      ))}
    </AppScreen>
  );
}
