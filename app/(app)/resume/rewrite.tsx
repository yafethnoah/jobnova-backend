import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { useAuth } from '@/src/features/auth/useAuth';
import { jobPostApi } from '@/src/api/jobPost';
import { resumeApi } from '@/src/api/resume';
import { getJson, saveJson } from '@/src/lib/localCache';
import { LATEST_RESUME_FILE_NAME_CACHE_KEY, LATEST_RESUME_TEXT_CACHE_KEY, RESUME_HISTORY_CACHE_KEY, RESUME_REWRITE_CACHE_KEY } from '@/src/features/resume/resume.cache';
import type { ResumeRewriteResponse } from '@/src/features/resume/resume.types';
import { stringListFromUnknown, textFromUnknown } from '@/src/lib/renderText';

export default function ResumeRewriteScreen() {
  const { accessToken } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');


  const extractMutation = useMutation({
    mutationFn: () => jobPostApi.extract(accessToken, jobPostingUrl.trim()),
    onSuccess: (data) => {
      const extracted = String(data.text || '').trim();
      if (extracted) setJobDescription(extracted);
    }
  });

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

  const rewriteMutation = useMutation({
    mutationFn: () => resumeApi.rewrite(accessToken, { resumeText: resumeText.trim(), targetRole: targetRole.trim() || undefined, jobDescription: jobDescription.trim() || undefined, jobPostingUrl: jobPostingUrl.trim() || undefined, uploadedFileName: uploadedFileName || undefined }),
    onSuccess: async (data) => {
      await saveJson(RESUME_REWRITE_CACHE_KEY, data);
      const existing = (await getJson<Array<{ targetRole?: string; at: string }>>(RESUME_HISTORY_CACHE_KEY)) ?? [];
      existing.unshift({ targetRole: targetRole.trim() || undefined, at: new Date().toISOString() });
      await saveJson(RESUME_HISTORY_CACHE_KEY, existing.slice(0, 20));
    }
  });

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'], copyToCacheDirectory: true, multiple: false });
    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      uploadMutation.mutate({ uri: file.uri, name: file.name, mimeType: file.mimeType });
    }
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Full tailored rewrite</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>In live mode the backend can extract text from DOCX and PDF, then generate a full tailored resume from either pasted job text or a real job posting link. If you provide both, it will merge the live posting with your extra notes.</Text>
      <AppCard>
        <View style={{ gap: 16 }}>
          <AppButton label={uploadMutation.isPending ? 'Uploading...' : uploadedFileName ? `Attached: ${uploadedFileName}` : 'Attach resume file'} variant="secondary" onPress={() => void handlePickDocument()} />
          {uploadMessage ? <Text style={{ color: '#C8D3F5' }}>{uploadMessage}</Text> : null}
          <AppInput label="Target role" value={targetRole} onChangeText={setTargetRole} placeholder="Example: HR Coordinator" autoCapitalize="words" />
          <AppInput label="Job posting link" value={jobPostingUrl} onChangeText={setJobPostingUrl} placeholder="https://company.com/jobs/role" autoCapitalize="none" keyboardType="url" />
          <AppButton label={extractMutation.isPending ? 'Extracting job text...' : 'Extract job text from link'} variant="secondary" onPress={() => extractMutation.mutate()} disabled={extractMutation.isPending || !jobPostingUrl.trim()} />
          <AppInput label="Job description" value={jobDescription} onChangeText={setJobDescription} placeholder="Paste the description here only if you do not have a link or you want to add extra notes" multiline autoCapitalize="sentences" />
          <AppInput label="Resume text" value={resumeText} onChangeText={setResumeText} placeholder="Paste your current resume text here or upload a file" multiline autoCapitalize="sentences" />
          <AppButton label={rewriteMutation.isPending ? 'Tailoring...' : 'Generate full tailored resume'} onPress={() => rewriteMutation.mutate()} disabled={rewriteMutation.isPending || !resumeText.trim()} />
        </View>
      </AppCard>
      {extractMutation.isError ? <ErrorState title="Could not extract job description" message={extractMutation.error instanceof Error ? extractMutation.error.message : 'Unknown error'} /> : null}
      {uploadMutation.isError ? <ErrorState title="Could not upload file" message={uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Unknown error'} /> : null}
      {rewriteMutation.isError ? <ErrorState title="Could not rewrite resume" message={rewriteMutation.error instanceof Error ? rewriteMutation.error.message : 'Unknown error'} /> : null}
      {rewriteMutation.data ? <RewriteResult data={rewriteMutation.data} /> : null}
    </AppScreen>
  );
}

function RewriteResult({ data }: { data: ResumeRewriteResponse }) {
  const improvedBullets = stringListFromUnknown(data.improvedBullets);
  const optimizedSkills = stringListFromUnknown(data.optimizedSkills);
  const priorityKeywords = stringListFromUnknown(data.priorityKeywords);
  const roleAlignmentNotes = stringListFromUnknown(data.roleAlignmentNotes);

  return (
    <>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Summary</Text>
        {data.analyzedFromUrl ? <Text style={{ marginTop: 8, color: '#96A7DE' }}>Tailored from live job posting{data.jobPostingTitle ? `: ${data.jobPostingTitle}` : ''}</Text> : null}
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.summary)}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Improved bullets</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {improvedBullets.map((item, index) => (
            <Text key={`${index}-${item}`} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Optimized skills</Text>
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {optimizedSkills.map((item, index) => (
            <View key={`${index}-${item}`} style={{ backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: '#34D399', fontWeight: '600' }}>{item}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Priority keywords</Text>
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {priorityKeywords.map((item, index) => (
            <View key={`pk-${index}-${item}`} style={{ backgroundColor: '#172554', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3B82F6' }}>
              <Text style={{ color: '#BFDBFE', fontWeight: '600' }}>{item}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Role alignment notes</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          {roleAlignmentNotes.map((item, index) => (
            <Text key={`ran-${index}-${item}`} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>
          ))}
        </View>
      </AppCard>


      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Rewritten full resume</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.rewrittenResume)}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Truth Guard</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.truthGuardNote)}</Text>
      </AppCard>
    </>
  );
}
