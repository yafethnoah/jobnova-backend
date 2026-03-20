import { useEffect, useState } from "react";
import * as DocumentPicker from 'expo-document-picker';
import { useMutation } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { LoadingView } from "@/src/components/ui/LoadingView";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { useCachedJson } from "@/src/hooks/useCachedJson";
import { useAuth } from "@/src/features/auth/useAuth";
import { onboardingApi } from "@/src/api/onboarding";
import { resumeApi } from '@/src/api/resume';
import { getJson, saveJson } from '@/src/lib/localCache';
import { LATEST_RESUME_FILE_NAME_CACHE_KEY, LATEST_RESUME_TEXT_CACHE_KEY } from '@/src/features/resume/resume.cache';
import type { CareerPathResult } from "@/src/features/career-path/careerPath.types";
import type { OnboardingAnswers } from "@/src/features/onboarding/onboarding.types";

const CAREER_PATH_CACHE_KEY = "northpath_career_path_result";

const defaultAnswers: OnboardingAnswers = {
  lifeStage: '',
  profession: '',
  yearsExperience: '',
  educationLevel: '',
  englishLevel: '',
  frenchLevel: '',
  hasCanadianExperience: false,
  targetGoal: '',
  urgencyLevel: 'medium'
};

export default function CareerPathScreen() {
  const { accessToken } = useAuth();
  const { data, loading } = useCachedJson<CareerPathResult>(CAREER_PATH_CACHE_KEY);
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers);
  const [resumeText, setResumeText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    void (async () => {
      const stored = await onboardingApi.getAnswers(accessToken || '');
      setAnswers((prev) => ({ ...prev, ...stored }));
      const cachedResume = await getJson<string>(LATEST_RESUME_TEXT_CACHE_KEY);
      const cachedFileName = await getJson<string>(LATEST_RESUME_FILE_NAME_CACHE_KEY);
      if (cachedResume?.trim()) setResumeText(cachedResume.trim());
      if (cachedFileName) setUploadedFileName(cachedFileName);
    })();
  }, [accessToken]);

  const uploadMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType?: string | null }) => resumeApi.upload(accessToken, file),
    onSuccess: async (data) => {
      const fileName = data.fileName || data.uploadedFileName || 'Attached file';
      setUploadedFileName(fileName);
      setUploadMessage(data.message || 'File attached.');
      await saveJson(LATEST_RESUME_FILE_NAME_CACHE_KEY, fileName);
      if (data.extractedText?.trim()) {
        const nextText = data.extractedText.trim();
        setResumeText(nextText);
        await saveJson(LATEST_RESUME_TEXT_CACHE_KEY, nextText);
      }
    }
  });

  const generateMutation = useMutation({
    mutationFn: () => onboardingApi.generateCareerPath(accessToken, { ...answers, resumeText: resumeText.trim() || undefined }),
    onSuccess: async (result) => {
      await saveJson(CAREER_PATH_CACHE_KEY, result);
    }
  });

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'], copyToCacheDirectory: true, multiple: false });
    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      uploadMutation.mutate({ uri: file.uri, name: file.name, mimeType: file.mimeType });
    }
  }

  const activeData = generateMutation.data || data;

  if (loading && !activeData) {
    return <LoadingView label="Loading your path..." />;
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }}>Career Path</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>This can generate a live path using your onboarding data plus your attached resume text, so the recommendations are less generic and less potato-like.</Text>

      <AppCard>
        <View style={{ gap: 14 }}>
          <AppInput label="Profession" value={answers.profession} onChangeText={(value) => setAnswers((prev) => ({ ...prev, profession: value }))} />
          <AppInput label="Target goal" value={answers.targetGoal} onChangeText={(value) => setAnswers((prev) => ({ ...prev, targetGoal: value }))} />
          <AppInput label="Years of experience" value={answers.yearsExperience} onChangeText={(value) => setAnswers((prev) => ({ ...prev, yearsExperience: value }))} keyboardType="numbers-and-punctuation" />
          <AppInput label="Education level" value={answers.educationLevel} onChangeText={(value) => setAnswers((prev) => ({ ...prev, educationLevel: value }))} />
          <AppInput label="English level" value={answers.englishLevel} onChangeText={(value) => setAnswers((prev) => ({ ...prev, englishLevel: value }))} />
          <AppButton label={uploadMutation.isPending ? 'Uploading resume...' : uploadedFileName ? `Resume attached: ${uploadedFileName}` : 'Attach resume for live pathing'} variant="secondary" onPress={() => void handlePickDocument()} />
          {uploadMessage ? <Text style={{ color: '#C8D3F5' }}>{uploadMessage}</Text> : null}
          <AppInput label="Resume text used for AI pathing" value={resumeText} onChangeText={setResumeText} multiline />
          <AppButton label={generateMutation.isPending ? 'Generating path...' : 'Generate live career path'} onPress={() => generateMutation.mutate()} disabled={generateMutation.isPending || !answers.profession.trim()} />
        </View>
      </AppCard>

      {uploadMutation.isError ? <ErrorState title="Could not upload resume" message={uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Unknown error'} /> : null}
      {generateMutation.isError ? <ErrorState title="Could not generate career path" message={generateMutation.error instanceof Error ? generateMutation.error.message : 'Unknown error'} /> : null}

      {!activeData ? <EmptyState title="No path yet" message="Complete onboarding or generate a live path using your actual background and resume." /> : null}

      {activeData ? <>
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>Primary path</Text>
          <Text style={{ marginTop: 10, color: "#C8D3F5", lineHeight: 24 }}>{activeData.primaryPath.title}</Text>
          <Text style={{ marginTop: 8, color: "#6B7280" }}>Estimated timeline: {activeData.primaryPath.estimatedTimeline}</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {activeData.primaryPath.steps.map((step, index) => (
              <Text key={`${index}-${step}`} style={{ color: "#C8D3F5", lineHeight: 24 }}>• {step}</Text>
            ))}
          </View>
        </AppCard>
        {activeData.bridgePath ? (
          <AppCard>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>Bridge path</Text>
            <Text style={{ marginTop: 10, color: "#C8D3F5", lineHeight: 24 }}>{activeData.bridgePath.title}</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {activeData.bridgePath.steps.map((step, index) => (
                <Text key={`${index}-${step}`} style={{ color: "#C8D3F5", lineHeight: 24 }}>• {step}</Text>
              ))}
            </View>
          </AppCard>
        ) : null}
        {activeData.skillsToBuild?.length ? <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Skills to build next</Text><View style={{ marginTop: 10, gap: 8 }}>{activeData.skillsToBuild.map((item, index) => <Text key={`${index}-${item}`} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>)}</View></AppCard> : null}
        {activeData.reasoning ? <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Why this path</Text><Text style={{ marginTop: 10, color: '#C8D3F5', lineHeight: 24 }}>{activeData.reasoning}</Text></AppCard> : null}
        {activeData.regulatedWarning ? (
          <AppCard>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>Important note</Text>
            <Text style={{ marginTop: 10, color: "#C8D3F5", lineHeight: 24 }}>{activeData.regulatedWarning}</Text>
          </AppCard>
        ) : null}
      </> : null}
    </AppScreen>
  );
}
