import { useEffect, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { useMutation } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/ui/AppButton";
import { AppCard } from "@/src/components/ui/AppCard";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppSelect } from "@/src/components/ui/AppSelect";
import { AppScreen } from "@/src/components/ui/AppScreen";
import { LoadingView } from "@/src/components/ui/LoadingView";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { StatusChip } from "@/src/components/ui/StatusChip";
import { useCachedJson } from "@/src/hooks/useCachedJson";
import { useAuth } from "@/src/features/auth/useAuth";
import { onboardingApi } from "@/src/api/onboarding";
import { resumeApi } from "@/src/api/resume";
import { getJson, saveJson } from "@/src/lib/localCache";
import {
  LATEST_RESUME_FILE_NAME_CACHE_KEY,
  LATEST_RESUME_TEXT_CACHE_KEY,
} from "@/src/features/resume/resume.cache";
import { openExternalLink } from "@/src/lib/openExternalLink";
import { colors } from "@/src/constants/colors";
import type { CareerPathResult } from "@/src/features/career-path/careerPath.types";
import type { OnboardingAnswers } from "@/src/features/onboarding/onboarding.types";

const CAREER_PATH_CACHE_KEY = "jobnova_career_path_result";

const defaultAnswers: OnboardingAnswers = {
  lifeStage: "",
  profession: "",
  yearsExperience: "",
  educationLevel: "",
  englishLevel: "",
  frenchLevel: "",
  hasCanadianExperience: false,
  targetGoal: "",
  urgencyLevel: "medium",
};

function PathCard({
  label,
  title,
  detail,
  steps,
  tone,
  cta,
  onPress,
}: {
  label: string;
  title: string;
  detail: string;
  steps: string[];
  tone: "primary" | "success" | "warning";
  cta: string;
  onPress: () => void;
}) {
  return (
    <AppCard>
      <View style={{ gap: 12 }}>
        <StatusChip label={label} tone={tone} />
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
          {title}
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>{detail}</Text>
        <View style={{ gap: 8 }}>
          {steps.slice(0, 3).map((step, index) => (
            <Text
              key={`${index}-${step}`}
              style={{ color: colors.text, lineHeight: 22 }}
            >
              • {step}
            </Text>
          ))}
        </View>
        <AppButton label={cta} variant="secondary" onPress={onPress} />
      </View>
    </AppCard>
  );
}

function normalizeStoredAnswers(payload: any): Partial<OnboardingAnswers> {
  if (!payload) return {};
  if (payload?.user?.onboarding) return payload.user.onboarding;
  if (payload?.onboarding) return payload.onboarding;
  return {};
}

export default function CareerPathScreen() {
  const { accessToken } = useAuth();
  const { data, loading } = useCachedJson<CareerPathResult>(CAREER_PATH_CACHE_KEY);
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers);
  const [resumeText, setResumeText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const stored = await onboardingApi.getAnswers();
        if (!(stored as any)?.error) {
          setAnswers((prev) => ({
            ...prev,
            ...normalizeStoredAnswers(stored),
          }));
        }
      } catch {
        // ignore bootstrap fetch error here
      }

      const cachedResume = await getJson<string>(LATEST_RESUME_TEXT_CACHE_KEY);
      const cachedFileName = await getJson<string>(LATEST_RESUME_FILE_NAME_CACHE_KEY);

      if (cachedResume?.trim()) setResumeText(cachedResume.trim());
      if (cachedFileName) setUploadedFileName(cachedFileName);
    })();
  }, []);

  const uploadMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType?: string | null }) =>
      resumeApi.upload(accessToken, file),
    onSuccess: async (result: any) => {
      const fileName = result.fileName || result.uploadedFileName || "Attached file";
      setUploadedFileName(fileName);
      setUploadMessage(result.message || "File attached.");
      await saveJson(LATEST_RESUME_FILE_NAME_CACHE_KEY, fileName);

      if (result.extractedText?.trim()) {
        const nextText = result.extractedText.trim();
        setResumeText(nextText);
        await saveJson(LATEST_RESUME_TEXT_CACHE_KEY, nextText);
      }
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const saveResult = await onboardingApi.saveAnswers({
        ...answers,
        profession: answers.profession?.trim() || "",
        targetGoal: answers.targetGoal?.trim() || "",
      });

      if ((saveResult as any)?.error === "unauthorized") {
        throw new Error("Unauthorized");
      }

      const result = await onboardingApi.generateCareerPath();

      if ((result as any)?.error === "unauthorized") {
        throw new Error("Unauthorized");
      }

      return result as CareerPathResult;
    },
    onSuccess: async (result) => {
      await saveJson(CAREER_PATH_CACHE_KEY, result);
    },
  });

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      uploadMutation.mutate({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      });
    }
  }

  const activeData = generateMutation.data || data;

  if (loading && !activeData) {
    return <LoadingView label="Loading your path..." />;
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: "800", color: colors.text }}>
        Career Path
      </Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted }}>
        Choose the route that fits your reality now: best fit, bridge role, or faster income. You can refine the recommendation with your actual resume.
      </Text>

      <AppCard>
        <View style={{ gap: 14 }}>
          <AppInput
            label="Profession"
            value={answers.profession}
            onChangeText={(value) =>
              setAnswers((prev) => ({ ...prev, profession: value }))
            }
          />

          <AppInput
            label="Target goal"
            value={answers.targetGoal}
            onChangeText={(value) =>
              setAnswers((prev) => ({ ...prev, targetGoal: value }))
            }
          />

          <AppSelect
            label="Years of experience"
            value={answers.yearsExperience}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, yearsExperience: value }))
            }
            placeholder="Select your experience range"
            options={[
              { label: "Less than 1 year", value: "Less than 1 year" },
              { label: "1–2 years", value: "1-2 years" },
              { label: "3–5 years", value: "3-5 years" },
              { label: "6–9 years", value: "6-9 years" },
              { label: "10+ years", value: "10+ years" },
            ]}
          />

          <AppSelect
            label="English level"
            value={answers.englishLevel}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, englishLevel: value }))
            }
            placeholder="Select your English level"
            options={[
              { label: "Basic", value: "basic" },
              { label: "Intermediate", value: "intermediate" },
              { label: "Advanced", value: "advanced" },
              { label: "Fluent", value: "fluent" },
              { label: "Excellent", value: "excellent" },
            ]}
          />

          <AppButton
            label={
              uploadMutation.isPending
                ? "Uploading resume..."
                : uploadedFileName
                ? `Resume attached: ${uploadedFileName}`
                : "Attach resume to improve path accuracy"
            }
            variant="secondary"
            onPress={() => {
              void handlePickDocument();
            }}
          />

          {uploadMessage ? (
            <Text style={{ color: colors.muted }}>{uploadMessage}</Text>
          ) : null}

          <AppButton
            label={generateMutation.isPending ? "Generating path..." : "Generate my path"}
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !answers.profession?.trim()}
          />
        </View>
      </AppCard>

      {uploadMutation.isError ? (
        <ErrorState
          title="Could not upload resume"
          message={
            uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : "Unknown error"
          }
        />
      ) : null}

      {generateMutation.isError ? (
        <ErrorState
          title="Could not generate career path"
          message={
            generateMutation.error instanceof Error
              ? generateMutation.error.message
              : "Unknown error"
          }
        />
      ) : null}

      {!activeData ? (
        <EmptyState
          title="No path yet"
          message="Generate your path to see the strongest route, a bridge route, and the first steps to take."
        />
      ) : null}

      {activeData ? (
        <>
          <PathCard
            label="Best fit path"
            tone="success"
            title={activeData.primaryPath.title}
            detail={`Best long-term fit. Estimated timeline: ${activeData.primaryPath.estimatedTimeline}.`}
            steps={activeData.primaryPath.steps}
            cta="Use this as my main direction"
            onPress={() =>
              setAnswers((prev) => ({
                ...prev,
                targetGoal: activeData.primaryPath.title,
              }))
            }
          />

          <PathCard
            label="Bridge path"
            tone="primary"
            title={activeData.bridgePath?.title || "Bridge option not generated yet"}
            detail="Use a bridge role when you need traction, local experience, or a shorter path into the market."
            steps={activeData.bridgePath?.steps || activeData.primaryPath.steps}
            cta="Keep this as my bridge route"
            onPress={() =>
              setAnswers((prev) => ({
                ...prev,
                targetGoal: activeData.bridgePath?.title || prev.targetGoal,
              }))
            }
          />

          <PathCard
            label="Fast income path"
            tone="warning"
            title={answers.targetGoal?.trim() ? `${answers.targetGoal} entry route` : "Fast income option"}
            detail="Use this when immediate momentum matters more than the perfect role right now."
            steps={(activeData.skillsToBuild?.slice(0, 3).map((item) => `Build or show ${item}`) || []).concat([
              "Track applications weekly",
              "Prepare one simple interview story",
            ])}
            cta="Use this as my urgent route"
            onPress={() =>
              setAnswers((prev) => ({ ...prev, urgencyLevel: "high" }))
            }
          />

          {activeData.skillsToBuild?.length ? (
            <AppCard>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                Skills to build next
              </Text>
              <View style={{ marginTop: 10, gap: 8 }}>
                {activeData.skillsToBuild.map((item, index) => (
                  <Text
                    key={`${index}-${item}`}
                    style={{ color: colors.muted, lineHeight: 22 }}
                  >
                    • {item}
                  </Text>
                ))}
              </View>
            </AppCard>
          ) : null}

          {activeData.reasoning ? (
            <AppCard>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                Why this path fits you
              </Text>
              <Text style={{ marginTop: 10, color: colors.muted, lineHeight: 24 }}>
                {activeData.reasoning}
              </Text>
            </AppCard>
          ) : null}

          {activeData.regulatedWarning ? (
            <AppCard>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                Important note
              </Text>
              <Text style={{ marginTop: 10, color: colors.muted, lineHeight: 24 }}>
                {activeData.regulatedWarning}
              </Text>
            </AppCard>
          ) : null}

          {activeData.officialLinks?.length ? (
            <AppCard>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                Official links
              </Text>
              <View style={{ marginTop: 12, gap: 10 }}>
                {activeData.officialLinks
                  .filter((item) => item?.url && String(item.url).trim())
                  .slice(0, 3)
                  .map((item, index) => (
                    <AppButton
                      key={`${index}-${item.url}`}
                      label={item.title}
                      variant="secondary"
                      onPress={() => {
                        void openExternalLink(item.url);
                      }}
                    />
                  ))}
              </View>
            </AppCard>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}