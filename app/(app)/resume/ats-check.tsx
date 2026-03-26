import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { useAuth } from '@/src/features/auth/useAuth';
import { jobPostApi } from '@/src/api/jobPost';
import { resumeApi } from '@/src/api/resume';
import { getJson, saveJson } from '@/src/lib/localCache';
import { useCachedJson } from '@/src/hooks/useCachedJson';
import { jobReadyApi } from '@/src/api/jobReady';
import { savePackageArtifactToDevice } from '@/src/lib/packageDownloads';
import { ATS_CHECK_CACHE_KEY, JOB_READY_PACKAGE_CACHE_KEY, LATEST_RESUME_FILE_NAME_CACHE_KEY, LATEST_RESUME_TEXT_CACHE_KEY, RESUME_HISTORY_CACHE_KEY, RESUME_UPLOAD_CACHE_KEY } from '@/src/features/resume/resume.cache';
import type { AtsCheckResponse, ResumeUploadResponse } from '@/src/features/resume/resume.types';
import type { ExportFormat } from '@/src/features/resume/jobReady.types';

const resumeDownloadFormats: { value: ExportFormat; label: string }[] = [
  { value: 'docx', label: 'Resume DOCX' },
  { value: 'pdf', label: 'Resume PDF' },
  { value: 'both', label: 'Resume DOCX + PDF' }
];

export default function AtsCheckScreen() {
  const { accessToken } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [jobExtractionWarning, setJobExtractionWarning] = useState('');
  const [extractedPostingTitle, setExtractedPostingTitle] = useState('');
  const [resumeDownloadFormat, setResumeDownloadFormat] = useState<ExportFormat>('both');

  const cachedResumeUpload = useCachedJson<{ fileName?: string; uploadedFileName?: string; extractedText?: string; message?: string }>(RESUME_UPLOAD_CACHE_KEY).data;
  const cachedResumeText = useCachedJson<string>(LATEST_RESUME_TEXT_CACHE_KEY).data;
  const cachedResumeFileName = useCachedJson<string>(LATEST_RESUME_FILE_NAME_CACHE_KEY).data;

  useEffect(() => {
    if (cachedResumeText && !resumeText.trim()) setResumeText(cachedResumeText);
    if (cachedResumeFileName && !uploadedFileName.trim()) setUploadedFileName(cachedResumeFileName);
    if (cachedResumeUpload?.message && !uploadMessage) setUploadMessage(cachedResumeUpload.message);
  }, [cachedResumeFileName, cachedResumeText, cachedResumeUpload?.message, resumeText, uploadMessage, uploadedFileName]);

  useEffect(() => {
    if (resumeText.trim()) return;
    let cancelled = false;
    resumeApi.latestUpload(accessToken).then(async (data) => {
      if (cancelled || !data) return;
      const nextText = String(data.extractedText || '').trim();
      const fileName = data.fileName || data.uploadedFileName || '';
      if (nextText) {
        setResumeText(nextText);
        await saveJson(LATEST_RESUME_TEXT_CACHE_KEY, nextText);
      }
      if (fileName) {
        setUploadedFileName(fileName);
        await saveJson(LATEST_RESUME_FILE_NAME_CACHE_KEY, fileName);
      }
      await saveJson(RESUME_UPLOAD_CACHE_KEY, data as ResumeUploadResponse);
      if (data.message) setUploadMessage(data.message);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [accessToken, resumeText]);

  const extractMutation = useMutation({
    mutationFn: () => jobPostApi.extract(accessToken, jobPostingUrl.trim()),
    onSuccess: (data) => {
      const extracted = String(data.text || '').trim();
      if (extracted) setJobDescription(extracted);
      setExtractedPostingTitle(String(data.title || '').trim());
      setJobExtractionWarning(String(data.warning || '').trim());
    }
  });

  const uploadMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType?: string | null }) => resumeApi.upload(accessToken, file),
    onSuccess: async (data) => {
      const fileName = data.fileName || data.uploadedFileName || 'Attached file';
      setUploadedFileName(fileName);
      setUploadMessage(data.message || 'File attached.');
      await saveJson(LATEST_RESUME_FILE_NAME_CACHE_KEY, fileName);
      await saveJson(RESUME_UPLOAD_CACHE_KEY, data);
      if (data.extractedText?.trim()) {
        const nextText = data.extractedText.trim();
        setResumeText(nextText);
        await saveJson(LATEST_RESUME_TEXT_CACHE_KEY, nextText);
      }
    }
  });

  const downloadMutation = useMutation({
    mutationFn: () =>
      jobReadyApi.generate(accessToken, {
        fullName: 'Candidate',
        targetRole: targetRole.trim() || 'Target Role',
        companyName: '',
        resumeText: resumeText.trim(),
        jobDescription: jobDescription.trim() || undefined,
        jobPostingUrl: jobPostingUrl.trim() || undefined,
        selectedResumeExportFormat: resumeDownloadFormat,
        selectedCoverLetterExportFormat: 'pdf',
        selectedRecruiterEmailExportFormat: 'pdf',
        selectedExportFormat: resumeDownloadFormat === 'both' ? 'both' : resumeDownloadFormat,
        selectedResumeThemeId: 'classic-canadian-professional',
        selectedLayoutMode: 'two-page'
      }),
    onSuccess: async (data) => {
      await saveJson(JOB_READY_PACKAGE_CACHE_KEY, data);
      const resumeArtifact = (data.exportArtifacts || []).find((item) => item.type === 'resume');
      if (resumeArtifact) {
        await savePackageArtifactToDevice(resumeArtifact, data);
        return;
      }
      router.push('/(app)/resume/export-center');
    }
  });

  const compareMutation = useMutation({
    mutationFn: () =>
      resumeApi.atsCheck(accessToken, {
        resumeText: resumeText.trim(),
        targetRole: targetRole.trim() || undefined,
        jobDescription: jobDescription.trim() || undefined,
        jobPostingUrl: jobPostingUrl.trim() || undefined,
        uploadedFileName: uploadedFileName || undefined
      }),
    onSuccess: async (data) => {
      await saveJson(ATS_CHECK_CACHE_KEY, data);
      const existing = (await getJson<{ targetRole?: string; score?: number; at: string }[]>(RESUME_HISTORY_CACHE_KEY)) ?? [];
      existing.unshift({ targetRole: targetRole.trim() || undefined, score: data.score, at: new Date().toISOString() });
      await saveJson(RESUME_HISTORY_CACHE_KEY, existing.slice(0, 20));
    }
  });

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false
    });
    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      uploadMutation.mutate({ uri: file.uri, name: file.name, mimeType: file.mimeType });
    }
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>ATS comparison</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Upload your real resume, paste the job text or add a job link, and compare both sides in one guided flow. If you add a link, JobNova will try to extract the posting automatically and combine it with any notes you include.
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 20, color: '#C8D3F5' }}>
        Tip: sign in if you want your uploads and ATS results saved to your account. Guest extraction can still run when the backend allows optional access.
      </Text>

      <AppCard>
        <View style={{ gap: 16 }}>
          <AppButton label={uploadMutation.isPending ? 'Uploading...' : uploadedFileName ? `Attached: ${uploadedFileName}` : 'Attach resume file'} variant="secondary" onPress={() => void handlePickDocument()} />
          {uploadMessage ? <Text style={{ color: '#C8D3F5' }}>{uploadMessage}</Text> : null}
          <AppInput label="Target role" value={targetRole} onChangeText={setTargetRole} placeholder="Example: HR Coordinator" autoCapitalize="words" />
          <AppInput label="Job posting link" value={jobPostingUrl} onChangeText={setJobPostingUrl} placeholder="https://company.com/jobs/role" autoCapitalize="none" keyboardType="url" />
          <AppButton label={extractMutation.isPending ? 'Extracting job text...' : 'Extract job text from link'} variant="secondary" onPress={() => extractMutation.mutate()} disabled={extractMutation.isPending || !jobPostingUrl.trim()} />
          {extractedPostingTitle ? <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Detected posting: {extractedPostingTitle}</Text> : null}
          <AppInput label="Job description or extra notes" value={jobDescription} onChangeText={setJobDescription} placeholder="Paste the description here only if you do not have a link or you want to add extra notes" multiline autoCapitalize="sentences" />
          {jobExtractionWarning ? <Text style={{ color: '#FBBF24', lineHeight: 20 }}>{jobExtractionWarning}</Text> : null}
          <AppInput label="Resume text" value={resumeText} onChangeText={setResumeText} placeholder="Paste your resume text here or upload a file" multiline autoCapitalize="sentences" />
          <AppButton label={compareMutation.isPending ? 'Comparing...' : 'Run ATS comparison'} onPress={() => compareMutation.mutate()} disabled={compareMutation.isPending || !resumeText.trim()} />
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Tailored resume device save format</Text>
          <View style={{ gap: 10 }}>
            {resumeDownloadFormats.map((option) => (
              <AppButton
                key={option.value}
                label={option.label}
                variant={resumeDownloadFormat === option.value ? 'primary' : 'secondary'}
                onPress={() => setResumeDownloadFormat(option.value)}
              />
            ))}
          </View>
        </View>
      </AppCard>

      {extractMutation.isError ? <ErrorState title="Could not extract job description" message={extractMutation.error instanceof Error ? extractMutation.error.message : 'Unknown error'} /> : null}
      {uploadMutation.isError ? <ErrorState title="Could not upload file" message={uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Unknown error'} /> : null}
      {compareMutation.isError ? <ErrorState title="Could not run ATS comparison" message={compareMutation.error instanceof Error ? compareMutation.error.message : 'Unknown error'} /> : null}
      {compareMutation.data ? <Results data={compareMutation.data} /> : null}
      {compareMutation.data ? <AppButton label={downloadMutation.isPending ? 'Saving ATS-tailored resume...' : 'Save ATS-tailored resume to device'} variant="secondary" onPress={() => downloadMutation.mutate()} disabled={downloadMutation.isPending || !resumeText.trim()} /> : null}
    </AppScreen>
  );
}

function Results({ data }: { data: AtsCheckResponse }) {
  return (
    <>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Overall ATS match</Text>
        <Text style={{ marginTop: 10, fontSize: 32, fontWeight: '800', color: '#FFFFFF' }}>{data.score}/100</Text>
        {data.analyzedFromUrl ? <Text style={{ marginTop: 8, color: '#96A7DE' }}>Analyzed from live job posting{data.jobPostingTitle ? `: ${data.jobPostingTitle}` : ''}</Text> : null}
        <View style={{ marginTop: 14, gap: 8 }}>
          <ScoreLine label="Keyword alignment" value={data.keywordScore} max={40} />
          <ScoreLine label="Skill alignment" value={data.skillScore} max={20} />
          <ScoreLine label="Title alignment" value={data.titleAlignmentScore} max={10} />
          <ScoreLine label="Experience evidence" value={data.experienceScore} max={15} />
          <ScoreLine label="Formatting" value={data.formattingScore} max={15} />
        </View>
      </AppCard>
      <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Strengths</Text><BulletList items={data.strengths} emptyLabel="No major strengths surfaced yet." /></AppCard>
      <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Matched keywords</Text><ChipList items={data.matchedKeywords} emptyLabel="No strong matches found yet." /></AppCard>
      <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Missing keywords</Text><ChipList items={data.missingKeywords} emptyLabel="No major gaps were detected." /></AppCard>
      <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Weak phrases</Text><BulletList items={data.weakPhrases} emptyLabel="No obvious vague phrasing found." /></AppCard>
      <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Formatting risks</Text><BulletList items={data.formattingRisks} emptyLabel="No major formatting risks detected." /></AppCard>
      <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Gaps recruiters may notice</Text><BulletList items={data.gaps} emptyLabel="No major recruiter gaps surfaced." /></AppCard>
      <AppCard><Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Recommendations</Text><BulletList items={data.recommendations} emptyLabel="No recommendations." /></AppCard>
    </>
  );
}
function ScoreLine({ label, value, max }: { label: string; value: number; max: number }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#C8D3F5' }}>{label}</Text><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{value}/{max}</Text></View>; }
function ChipList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) { if (!items.length) return <Text style={{ marginTop: 10, color: '#6B7280' }}>{emptyLabel}</Text>; return <View style={{ marginTop: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{items.map((item) => <View key={item} style={{ backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: '#3730A3', fontWeight: '600' }}>{item}</Text></View>)}</View>; }
function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) { if (!items.length) return <Text style={{ marginTop: 10, color: '#6B7280' }}>{emptyLabel}</Text>; return <View style={{ marginTop: 10, gap: 8 }}>{items.map((item, index) => <Text key={`${index}-${item}`} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>)}</View>; }
