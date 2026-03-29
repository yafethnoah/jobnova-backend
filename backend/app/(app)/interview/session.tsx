import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { useAuth } from '@/src/features/auth/useAuth';
import { interviewApi } from '@/src/api/interview';
import { getJson, saveJson } from '@/src/lib/localCache';
import { INTERVIEW_FEEDBACK_CACHE_KEY, INTERVIEW_HISTORY_CACHE_KEY } from '@/src/features/interview/interview.cache';
import type { InterviewFeedbackResponse } from '@/src/features/interview/interview.types';

type StepFeedback = InterviewFeedbackResponse & { question: string; answer: string; index: number };

export default function InterviewSessionScreen() {
  const { accessToken } = useAuth();
  const [role, setRole] = useState('');
  const [question, setQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answer, setAnswer] = useState('');
  const [started, setStarted] = useState(false);
  const [feedbacks, setFeedbacks] = useState<StepFeedback[]>([]);

  const questionMutation = useMutation({
    mutationFn: (index: number) => interviewApi.getQuestion(accessToken, role.trim(), index),
    onSuccess: (data) => {
      setQuestion(data.question);
      setQuestionIndex(data.index);
      setTotalQuestions(data.total);
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: () => interviewApi.getFeedback(accessToken, { role: role.trim(), question, answer: answer.trim() }),
    onSuccess: async (data) => {
      const newItem: StepFeedback = { ...data, question, answer: answer.trim(), index: questionIndex };
      const next = [...feedbacks, newItem];
      setFeedbacks(next);
      await saveJson(INTERVIEW_FEEDBACK_CACHE_KEY, newItem);
      setAnswer('');

      const isLast = questionIndex + 1 >= totalQuestions;
      if (isLast) {
        const average = Math.round(next.reduce((sum, item) => sum + item.clarity + item.structure + item.relevance, 0) / (next.length * 3));
        const history = (await getJson<{ role: string; completedAt: string; average: number }[]>(INTERVIEW_HISTORY_CACHE_KEY)) ?? [];
        history.unshift({ role: role.trim(), completedAt: new Date().toISOString(), average });
        await saveJson(INTERVIEW_HISTORY_CACHE_KEY, history.slice(0, 20));
        router.push({
          pathname: '/(app)/interview/feedback',
          params: {
            role: role.trim(),
            average: String(average),
            feedbacks: JSON.stringify(next)
          }
        });
        return;
      }

      questionMutation.mutate(questionIndex + 1);
    }
  });

  function startSession() {
    if (!role.trim()) return;
    setStarted(true);
    setFeedbacks([]);
    setAnswer('');
    questionMutation.mutate(0);
  }

  const currentFeedback = feedbacks[feedbacks.length - 1];

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Full practice session</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Complete all five questions. Every answer gets immediate feedback, and the session ends with an overall summary instead of a shrug.
      </Text>

      <AppCard>
        <View style={{ gap: 16 }}>
          <AppInput label="Target role" value={role} onChangeText={setRole} placeholder="Example: HR Coordinator" autoCapitalize="words" />
          <AppButton label={started ? 'Restart session' : 'Start session'} onPress={startSession} disabled={!role.trim() || questionMutation.isPending} />
        </View>
      </AppCard>

      {questionMutation.isError ? (
        <ErrorState title="Could not generate question" message={questionMutation.error instanceof Error ? questionMutation.error.message : 'Unknown error'} />
      ) : null}

      {started && question ? (
        <>
          <AppCard>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#6366F1' }}>Question {questionIndex + 1} of {totalQuestions}</Text>
            <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{question}</Text>
          </AppCard>

          <AppCard>
            <View style={{ gap: 16 }}>
              <AppInput label="Your answer" value={answer} onChangeText={setAnswer} placeholder="Write your answer here" multiline autoCapitalize="sentences" />
              <AppButton label={feedbackMutation.isPending ? 'Analyzing...' : 'Submit answer'} onPress={() => answer.trim() && feedbackMutation.mutate()} disabled={feedbackMutation.isPending || !answer.trim()} />
            </View>
          </AppCard>
        </>
      ) : null}

      {currentFeedback ? (
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Latest feedback</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={{ color: '#C8D3F5' }}>Clarity: {currentFeedback.clarity}/10</Text>
            <Text style={{ color: '#C8D3F5' }}>Structure: {currentFeedback.structure}/10</Text>
            <Text style={{ color: '#C8D3F5' }}>Relevance: {currentFeedback.relevance}/10</Text>
            <Text style={{ color: '#C8D3F5' }}>{currentFeedback.strength}</Text>
          </View>
        </AppCard>
      ) : null}
    </AppScreen>
  );
}
