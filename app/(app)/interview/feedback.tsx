import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
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
  const areaTotals = feedbacks.reduce((acc, item) => ({
    clarity: acc.clarity + item.clarity,
    structure: acc.structure + item.structure,
    relevance: acc.relevance + item.relevance
  }), { clarity: 0, structure: 0, relevance: 0 });
  const strongestArea = feedbacks.length ? (Object.entries(areaTotals).sort((a, b) => a[1] - b[1]).pop()?.[0] ?? null) : null;

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Session summary</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Role practiced: {params.role ?? 'Unknown role'}
      </Text>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Average interview score</Text>
        <Text style={{ marginTop: 10, fontSize: 32, fontWeight: '800', color: '#FFFFFF' }}>{params.average ?? '0'}/10</Text>
        <Text style={{ marginTop: 10, color: '#C8D3F5', lineHeight: 24 }}>Strongest area: {strongestArea ? strongestArea.charAt(0).toUpperCase() + strongestArea.slice(1) : 'Not enough data yet'}.</Text>
        <Text style={{ marginTop: 6, color: '#C8D3F5', lineHeight: 24 }}>Next move: review the weaker answers below, tighten the STAR structure, then run another full session for the same role.</Text>
      </AppCard>

      {feedbacks.map((item) => (
        <AppCard key={`${item.index}-${item.question}`}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Question {item.index + 1}</Text>
          <Text style={{ marginTop: 8, color: '#FFFFFF', lineHeight: 24 }}>{item.question}</Text>
          <View style={{ marginTop: 12, gap: 6 }}>
            <Text style={{ color: '#C8D3F5' }}>Clarity: {item.clarity}/10</Text>
            <Text style={{ color: '#C8D3F5' }}>Structure: {item.structure}/10</Text>
            <Text style={{ color: '#C8D3F5' }}>Relevance: {item.relevance}/10</Text>
          </View>
          <Text style={{ marginTop: 12, color: '#C8D3F5', lineHeight: 24 }}>{item.strength}</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            {item.improvements.map((improvement, idx) => (
              <Text key={`${idx}-${improvement}`} style={{ color: '#C8D3F5', lineHeight: 24 }}>
                • {improvement}
              </Text>
            ))}
          </View>
        </AppCard>
      ))}
    </AppScreen>
  );
}
