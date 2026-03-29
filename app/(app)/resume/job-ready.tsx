import { useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppInput } from '@/src/components/ui/AppInput';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { jobReadyApi } from '@/src/api/jobReady';
import { useAuth } from '@/src/features/auth/useAuth';
import { jobPostApi } from '@/src/api/jobPost';
import { saveJson } from '@/src/lib/localCache';
import {
  saveFullPackageToDevice,
  savePackageArtifactToDevice
} from '@/src/lib/packageDownloads';
import {
  JOB_READY_PACKAGE_CACHE_KEY,
  LATEST_RESUME_TEXT_CACHE_KEY,
  RESUME_UPLOAD_CACHE_KEY
} from '@/src/features/resume/resume.cache';
import type {
  ExportArtifact,
  ExportFormat,
  JobReadyPackage,
  LayoutMode,
  ResumeThemeId
} from '@/src/features/resume/jobReady.types';
import { useCachedJson } from '@/src/hooks/useCachedJson';
import { resumeApi } from '@/src/api/resume';
import { textFromUnknown } from '@/src/lib/renderText';

type UploadedResume = {
  extractedText?: string;
  fileName?: string;
  uploadedFileName?: string;
  message?: string;
};

function normalizeExportArtifacts(value: unknown): ExportArtifact[] {
  const items = Array.isArray(value) ? value : value ? [value as never] : [];

  return items
    .map((item) => {
      const record = item as Record<string, unknown>;
      const fileName = String(record?.fileName || record?.filename || record?.name || '').trim();
      if (!fileName) return null;

      return {
        id: typeof record?.id === 'string' ? record.id : undefined,
        label: String(record?.label || record?.type || fileName).trim(),
        type:
          record?.type === 'cover-letter' || record?.type === 'recruiter-email'
            ? record.type
            : 'resume',
        format: record?.format === 'docx' || record?.format === 'pdf' ? record.format : 'txt',
        fileName,
        downloadUrl: typeof record?.downloadUrl === 'string' ? record.downloadUrl : undefined,
        createdAt: typeof record?.createdAt === 'string' ? record.createdAt : undefined,
        targetRole: typeof record?.targetRole === 'string' ? record.targetRole : undefined,
        companyName: typeof record?.companyName === 'string' ? record.companyName : undefined
      } satisfies ExportArtifact;
    })
    .filter(Boolean) as ExportArtifact[];
}



function renderListFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n•,]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [];
}


const exportFormats: { value: ExportFormat; label: string }[] = [
  { value: 'docx', label: 'Word only' },
  { value: 'pdf', label: 'PDF only' },
  { value: 'both', label: 'Word + PDF' }
];

function getArtifactsByType(artifacts: ExportArtifact[], type: ExportArtifact['type']) {
  return artifacts.filter((artifact) => artifact.type === type && artifact.downloadUrl && !artifact.downloadUrl.includes('undefined'));
}

function artifactButtonLabel(artifact: ExportArtifact) {
  return `${artifact.label} • ${artifact.fileName}`;
}

export default function JobReadyScreen() {
  const { accessToken, user } = useAuth();
  const uploadedResume = useCachedJson<UploadedResume>(RESUME_UPLOAD_CACHE_KEY).data;
  const cachedResumeText = useCachedJson<string>(LATEST_RESUME_TEXT_CACHE_KEY).data;

  const [targetRole, setTargetRole] = useState(user?.targetRole || 'HR Coordinator');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [jobExtractionWarning, setJobExtractionWarning] = useState('');
  const [extractedPostingTitle, setExtractedPostingTitle] = useState('');
  const [resumeText, setResumeText] = useState(uploadedResume?.extractedText || cachedResumeText || '');
  const [uploadedFileName, setUploadedFileName] = useState(uploadedResume?.fileName || uploadedResume?.uploadedFileName || '');
  const [uploadMessage, setUploadMessage] = useState(uploadedResume?.message || '');
  const [selectedResumeExportFormat, setSelectedResumeExportFormat] = useState<ExportFormat>('both');
  const [selectedCoverLetterExportFormat, setSelectedCoverLetterExportFormat] = useState<ExportFormat>('both');
  const [selectedRecruiterEmailExportFormat, setSelectedRecruiterEmailExportFormat] = useState<ExportFormat>('both');
  const [selectedResumeThemeId, setSelectedResumeThemeId] = useState<ResumeThemeId>('classic-canadian-professional');
  const [selectedLayoutMode, setSelectedLayoutMode] = useState<LayoutMode>('one-page');

  useEffect(() => {
    if (uploadedResume?.extractedText?.trim() && !resumeText.trim()) {
      setResumeText(uploadedResume.extractedText.trim());
    }

    const detectedFileName = uploadedResume?.fileName || uploadedResume?.uploadedFileName || '';
    if (detectedFileName && !uploadedFileName) {
      setUploadedFileName(detectedFileName);
    }
  }, [uploadedResume?.extractedText, uploadedResume?.fileName, uploadedResume?.uploadedFileName, resumeText, uploadedFileName]);

  useEffect(() => {
    if (resumeText.trim()) return;

    let cancelled = false;

    resumeApi
      .latestUpload(accessToken)
      .then(async (data) => {
        if (cancelled || !data) return;

        const nextText = String(data.extractedText || '').trim();
        const fileName = data.fileName || data.uploadedFileName || '';

        if (nextText) {
          setResumeText(nextText);
          await saveJson(LATEST_RESUME_TEXT_CACHE_KEY, nextText);
        }

        if (fileName) {
          setUploadedFileName(fileName);
        }

        await saveJson(RESUME_UPLOAD_CACHE_KEY, data);

        if (data.message) {
          setUploadMessage(data.message);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [accessToken, resumeText]);

  const uploadMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType?: string | null }) => resumeApi.upload(accessToken, file),
    onSuccess: async (data) => {
      const fileName = data.fileName || data.uploadedFileName || 'Attached file';
      setUploadedFileName(fileName);
      setUploadMessage(data.message || 'File attached.');
      await saveJson(RESUME_UPLOAD_CACHE_KEY, data);

      if (data.extractedText?.trim()) {
        setResumeText(data.extractedText.trim());
        await saveJson(LATEST_RESUME_TEXT_CACHE_KEY, data.extractedText.trim());
      }
    }
  });

  const extractMutation = useMutation({
    mutationFn: () => jobPostApi.extract(accessToken, jobPostingUrl.trim()),
    onSuccess: (data) => {
      const extracted = String(data.text || '').trim();
      if (extracted) setJobDescription(extracted);
      if (data.company?.trim() && !companyName.trim()) setCompanyName(data.company.trim());
      setExtractedPostingTitle(String(data.title || '').trim());
      setJobExtractionWarning(String(data.warning || '').trim());
    }
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        fullName: String(user?.fullName || 'Candidate').trim(),
        targetRole: targetRole.trim(),
        companyName: companyName.trim(),
        jobDescription: jobDescription.trim(),
        jobPostingUrl: jobPostingUrl.trim(),
        resumeText: resumeText.trim(),
        selectedExportFormat: 'both' as ExportFormat,
        selectedResumeExportFormat,
        selectedCoverLetterExportFormat,
        selectedRecruiterEmailExportFormat,
        selectedResumeThemeId,
        selectedLayoutMode
      };

      return jobReadyApi.generate(accessToken, payload);
    },
    onSuccess: async (data) => saveJson(JOB_READY_PACKAGE_CACHE_KEY, data)
  });

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ],
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
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Job-ready package</Text>

      <Text style={{ fontSize: 16, lineHeight: 24, color: '#B8C4E4' }}>
        Generate a recruiter-ready package with an ATS-safer tailored resume, polished cover letter, recruiter email, and downloadable files you can save directly to the phone through the share sheet.
      </Text>

      <AppCard>
        <View style={{ gap: 14 }}>
          <AppButton
            label={
              uploadMutation.isPending
                ? 'Uploading resume...'
                : uploadedFileName
                  ? `Attached: ${uploadedFileName}`
                  : 'Attach resume file'
            }
            variant="secondary"
            onPress={() => void handlePickDocument()}
          />

          {uploadMessage ? <Text style={{ color: '#C8D3F5' }}>{uploadMessage}</Text> : null}

          <AppInput label="Target role" value={targetRole} onChangeText={setTargetRole} />
          <AppInput label="Company" value={companyName} onChangeText={setCompanyName} />

          <AppInput
            label="Job posting URL (optional)"
            value={jobPostingUrl}
            onChangeText={setJobPostingUrl}
            placeholder="https://company.com/jobs/role"
            autoCapitalize="none"
            keyboardType="url"
          />

          <AppButton
            label={extractMutation.isPending ? 'Extracting job text...' : 'Extract job text from link'}
            variant="secondary"
            onPress={() => extractMutation.mutate()}
            disabled={extractMutation.isPending || !jobPostingUrl.trim()}
          />

          {extractedPostingTitle ? <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Detected posting: {extractedPostingTitle}</Text> : null}
          {jobExtractionWarning ? <Text style={{ color: '#FBBF24', lineHeight: 20 }}>{jobExtractionWarning}</Text> : null}

          <Text style={{ color: '#96A7DE' }}>
            If you add a job link, JobNova will try to extract the posting text automatically and
            blend it with any notes you paste below.
          </Text>


          <AppInput
            label="Job description or extra notes"
            value={jobDescription}
            onChangeText={setJobDescription}
            multiline
            placeholder="Paste the description or add extra notes only if the link misses details"
          />

          <AppInput label="Base resume text" value={resumeText} onChangeText={setResumeText} multiline />

          {uploadedFileName ? (
            <Text style={{ color: '#C8D3F5' }}>Latest attached resume detected: {uploadedFileName}</Text>
          ) : null}

          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Document theme</Text>
          <View style={{ gap: 10 }}>
            {[
              { value: 'modern-minimal', label: 'Modern minimal' },
              { value: 'classic-canadian-professional', label: 'Classic Canadian professional' },
              { value: 'executive-clean', label: 'Executive clean' },
              { value: 'nonprofit-academic-friendly', label: 'Nonprofit / academic-friendly' }
            ].map((option) => (
              <AppButton
                key={option.value}
                label={option.label}
                variant={selectedResumeThemeId === option.value ? 'primary' : 'secondary'}
                onPress={() => setSelectedResumeThemeId(option.value as ResumeThemeId)}
              />
            ))}
          </View>

          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>ATS layout mode</Text>
          <View style={{ gap: 10 }}>
            {[
              { value: 'one-page', label: 'True one-page ATS layout' },
              { value: 'two-page', label: 'True two-page ATS layout' }
            ].map((option) => (
              <AppButton
                key={option.value}
                label={option.label}
                variant={selectedLayoutMode === option.value ? 'primary' : 'secondary'}
                onPress={() => setSelectedLayoutMode(option.value as LayoutMode)}
              />
            ))}
          </View>

          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Resume export format</Text>
          <View style={{ gap: 10 }}>
            {exportFormats.map((option) => (
              <AppButton
                key={`resume-${option.value}`}
                label={option.label}
                variant={selectedResumeExportFormat === option.value ? 'primary' : 'secondary'}
                onPress={() => setSelectedResumeExportFormat(option.value)}
              />
            ))}
          </View>

          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Cover letter export format</Text>
          <View style={{ gap: 10 }}>
            {exportFormats.map((option) => (
              <AppButton
                key={`cover-${option.value}`}
                label={option.label}
                variant={selectedCoverLetterExportFormat === option.value ? 'primary' : 'secondary'}
                onPress={() => setSelectedCoverLetterExportFormat(option.value)}
              />
            ))}
          </View>

          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Recruiter email export format</Text>
          <View style={{ gap: 10 }}>
            {exportFormats.map((option) => (
              <AppButton
                key={`email-${option.value}`}
                label={option.label}
                variant={selectedRecruiterEmailExportFormat === option.value ? 'primary' : 'secondary'}
                onPress={() => setSelectedRecruiterEmailExportFormat(option.value)}
              />
            ))}
          </View>

          <AppButton
            label={mutation.isPending ? 'Generating package...' : 'Generate job-ready package'}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending || !targetRole.trim() || !resumeText.trim()}
          />
        </View>
      </AppCard>

      {extractMutation.isError ? (
        <ErrorState
          title="Could not extract job description"
          message={extractMutation.error instanceof Error ? extractMutation.error.message : 'Unknown error'}
        />
      ) : null}

      {uploadMutation.isError ? (
        <ErrorState
          title="Could not upload resume"
          message={uploadMutation.error instanceof Error ? uploadMutation.error.message : 'Unknown error'}
        />
      ) : null}

      {mutation.isError ? (
        <ErrorState
          title="Could not generate package"
          message={mutation.error instanceof Error ? mutation.error.message : 'Unknown error'}
        />
      ) : null}

      {mutation.data ? <PackageView data={mutation.data} /> : null}
    </AppScreen>
  );
}

function PackageView({ data }: { data: JobReadyPackage }) {
  const exportArtifacts = normalizeExportArtifacts(data.exportArtifacts);
  const liveResumeArtifacts = useMemo(() => getArtifactsByType(exportArtifacts, 'resume'), [exportArtifacts]);
  const liveCoverArtifacts = useMemo(() => getArtifactsByType(exportArtifacts, 'cover-letter'), [exportArtifacts]);
  const liveRecruiterArtifacts = useMemo(() => getArtifactsByType(exportArtifacts, 'recruiter-email'), [exportArtifacts]);
  const hasLiveDownloads = Boolean(data.packageBundleUrl || liveResumeArtifacts.length || liveCoverArtifacts.length || liveRecruiterArtifacts.length);
  const [savingLabel, setSavingLabel] = useState<string | null>(null);

  async function handleSaveArtifact(label: string, action: () => Promise<unknown>) {
    try {
      setSavingLabel(label);
      await action();
    } finally {
      setSavingLabel(null);
    }
  }

  return (
    <>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Package summary</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{data.exportSummary}</Text>
        <Text style={{ marginTop: 10, color: '#C8D3F5' }}>Recommended resume template: {data.recommendedResumeTemplateId}</Text>
        <Text style={{ marginTop: 4, color: '#C8D3F5' }}>Resume theme: {data.selectedResumeThemeId ?? 'classic-canadian-professional'}</Text>
        <Text style={{ marginTop: 4, color: '#C8D3F5' }}>ATS layout mode: {data.selectedLayoutMode ?? 'one-page'}</Text>
        <Text style={{ marginTop: 4, color: '#C8D3F5' }}>Recommended cover letter template: {data.recommendedCoverLetterTemplateId}</Text>
        <Text style={{ marginTop: 4, color: '#C8D3F5' }}>Resume export: {data.selectedResumeExportFormat ?? data.selectedExportFormat ?? 'both'}</Text>
        <Text style={{ marginTop: 4, color: '#C8D3F5' }}>Cover letter export: {data.selectedCoverLetterExportFormat ?? data.selectedExportFormat ?? 'both'}</Text>
        <Text style={{ marginTop: 4, color: '#C8D3F5' }}>Recruiter email export: {data.selectedRecruiterEmailExportFormat ?? data.selectedExportFormat ?? 'both'}</Text>
        {data.parsedJobPosting?.url ? <Text style={{ marginTop: 4, color: '#C8D3F5' }}>Job link parsed: {data.parsedJobPosting.url}</Text> : null}
        {data.parsedJobPosting?.finalUrl && data.parsedJobPosting.finalUrl !== data.parsedJobPosting.url ? <Text style={{ marginTop: 4, color: '#C8D3F5' }}>Final job URL: {data.parsedJobPosting.finalUrl}</Text> : null}
        {data.parsedJobPosting?.extractionMethod ? <Text style={{ marginTop: 4, color: '#C8D3F5' }}>Extraction method: {data.parsedJobPosting.extractionMethod}</Text> : null}
        {data.parsedJobPosting?.warning ? <Text style={{ marginTop: 6, color: '#FBBF24' }}>{data.parsedJobPosting.warning}</Text> : null}
      </AppCard>

      {data.atsBenchmark ? (
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>ATS benchmark</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text style={{ color: '#C8D3F5' }}>Your score: {data.atsBenchmark.overallScore}/100</Text>
            <Text style={{ color: '#C8D3F5' }}>Market average: {data.atsBenchmark.marketAverage}/100</Text>
            <Text style={{ color: '#C8D3F5' }}>Top 10% benchmark: {data.atsBenchmark.top10Percent}/100</Text>
            <Text style={{ color: '#C8D3F5' }}>Semantic match: {data.atsBenchmark.semanticMatch}/100</Text>
            <Text style={{ color: '#C8D3F5' }}>Recruiter fit: {data.atsBenchmark.recruiterFit}/100</Text>
            {data.atsBenchmark.matchedKeywords?.length ? <Text style={{ color: '#C8D3F5' }}>Matched keywords: {data.atsBenchmark.matchedKeywords.join(', ')}</Text> : null}
            {data.atsBenchmark.missingKeywords?.length ? <Text style={{ color: '#FBBF24' }}>Missing keywords: {data.atsBenchmark.missingKeywords.join(', ')}</Text> : null}
          </View>
        </AppCard>
      ) : null}

      {data.careerNarrative ? (
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Career narrative</Text>
          <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{data.careerNarrative.positioningStatement}</Text>
          {data.careerNarrative.topThemes?.length ? <Text style={{ marginTop: 10, color: '#C8D3F5' }}>Top themes: {data.careerNarrative.topThemes.join(' • ')}</Text> : null}
          <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>Interview bridge: {data.careerNarrative.interviewBridge}</Text>
        </AppCard>
      ) : null}

      {renderListFromUnknown(data.recruiterLens).length ? (
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Recruiter eye view</Text>
          <View style={{ marginTop: 10, gap: 8 }}>{renderListFromUnknown(data.recruiterLens).map((item, index) => <Text key={`recruiter-${index}`} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>)}</View>
        </AppCard>
      ) : null}

      {renderListFromUnknown(data.quickWins).length ? (
        <AppCard>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Priority quick wins</Text>
          <View style={{ marginTop: 10, gap: 8 }}>{renderListFromUnknown(data.quickWins).map((item, index) => <Text key={`quick-${index}`} style={{ color: '#C8D3F5', lineHeight: 24 }}>• {item}</Text>)}</View>
        </AppCard>
      ) : null}

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Tailored resume</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.tailoredResume || data.amendedResume)}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Cover letter optimization</Text>
        <Text style={{ marginTop: 10, color: '#FFFFFF', fontWeight: '700' }}>Focus points</Text>
        <Text style={{ marginTop: 6, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.coverLetterHighlights)}</Text>
        <Text style={{ marginTop: 10, color: '#FFFFFF', fontWeight: '700' }}>Resume-to-role match insights</Text>
        <Text style={{ marginTop: 6, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.resumeMatchInsights)}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Cover letter</Text>
        <Text style={{ marginTop: 10, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.coverLetter)}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Recruiter email draft</Text>
        <Text style={{ marginTop: 10, color: '#FFFFFF', fontWeight: '700' }}>Subject</Text>
        <Text style={{ marginTop: 6, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.recruiterEmailSubject)}</Text>
        <Text style={{ marginTop: 10, color: '#FFFFFF', fontWeight: '700' }}>Body</Text>
        <Text style={{ marginTop: 6, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.recruiterEmailBody)}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>LinkedIn upgrades</Text>
        <Text style={{ marginTop: 10, color: '#FFFFFF', fontWeight: '700' }}>Headline</Text>
        <Text style={{ marginTop: 6, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.linkedinHeadline)}</Text>
        <Text style={{ marginTop: 10, color: '#FFFFFF', fontWeight: '700' }}>About</Text>
        <Text style={{ marginTop: 6, lineHeight: 24, color: '#C8D3F5' }}>{textFromUnknown(data.linkedinAbout)}</Text>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Save package to device</Text>
        <Text style={{ marginTop: 8, lineHeight: 22, color: '#96A7DE' }}>
          {hasLiveDownloads
            ? 'Each file is saved locally first, then the phone share sheet opens so the user can store it in Files or another destination.'
            : 'Backend downloads are not available right now, so JobNova will generate a readable Word-friendly or print-friendly fallback file on your device instead of a broken fake export.'}
        </Text>

        <View style={{ marginTop: 12, gap: 10 }}>
          <AppButton
            label={
              savingLabel === '__full__'
                ? 'Saving full package...'
                : hasLiveDownloads
                  ? 'Save full tailored package'
                  : 'Save full package fallback (.html)'
            }
            onPress={() => void handleSaveArtifact('__full__', () => saveFullPackageToDevice(data))}
            disabled={Boolean(savingLabel)}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Download individual sections</Text>
        <Text style={{ marginTop: 8, lineHeight: 22, color: '#96A7DE' }}>
          Download the resume, cover letter, or recruiter email on its own. When the backend is offline, each section still saves as a readable fallback document you can store, print, or open in another app.
        </Text>

        <View style={{ marginTop: 14, gap: 12 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Resume only</Text>
            {liveResumeArtifacts.length ? (
              liveResumeArtifacts.map((artifact) => (
                <AppButton
                  key={artifact.fileName}
                  label={savingLabel === artifact.fileName ? `Saving ${artifact.label}...` : artifactButtonLabel(artifact)}
                  variant="secondary"
                  onPress={() => void handleSaveArtifact(artifact.fileName, () => savePackageArtifactToDevice(artifact, data))}
                  disabled={Boolean(savingLabel)}
                />
              ))
            ) : (
              <AppButton
                label={savingLabel === '__resume_preview__' ? 'Saving resume fallback...' : 'Save resume fallback document'}
                variant="secondary"
                onPress={() =>
                  void handleSaveArtifact('__resume_preview__', () =>
                    savePackageArtifactToDevice(
                      {
                        label: 'Resume fallback',
                        type: 'resume',
                        format: (data.selectedResumeExportFormat === 'pdf' ? 'pdf' : 'docx'),
                        fileName: `${data.roleTitle || 'Resume'}_Resume_Fallback.${data.selectedResumeExportFormat === 'pdf' ? 'pdf' : 'docx'}`
                      },
                      data
                    )
                  )
                }
                disabled={Boolean(savingLabel)}
              />
            )}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Cover letter only</Text>
            {liveCoverArtifacts.length ? (
              liveCoverArtifacts.map((artifact) => (
                <AppButton
                  key={artifact.fileName}
                  label={savingLabel === artifact.fileName ? `Saving ${artifact.label}...` : artifactButtonLabel(artifact)}
                  variant="secondary"
                  onPress={() => void handleSaveArtifact(artifact.fileName, () => savePackageArtifactToDevice(artifact, data))}
                  disabled={Boolean(savingLabel)}
                />
              ))
            ) : (
              <AppButton
                label={savingLabel === '__cover_preview__' ? 'Saving cover letter fallback...' : 'Save cover letter fallback document'}
                variant="secondary"
                onPress={() =>
                  void handleSaveArtifact('__cover_preview__', () =>
                    savePackageArtifactToDevice(
                      {
                        label: 'Cover letter fallback',
                        type: 'cover-letter',
                        format: (data.selectedCoverLetterExportFormat === 'pdf' ? 'pdf' : 'docx'),
                        fileName: `${data.roleTitle || 'Cover_Letter'}_Cover_Letter_Fallback.${data.selectedCoverLetterExportFormat === 'pdf' ? 'pdf' : 'docx'}`
                      },
                      data
                    )
                  )
                }
                disabled={Boolean(savingLabel)}
              />
            )}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Recruiter email only</Text>
            {liveRecruiterArtifacts.length ? (
              liveRecruiterArtifacts.map((artifact) => (
                <AppButton
                  key={artifact.fileName}
                  label={savingLabel === artifact.fileName ? `Saving ${artifact.label}...` : artifactButtonLabel(artifact)}
                  variant="secondary"
                  onPress={() => void handleSaveArtifact(artifact.fileName, () => savePackageArtifactToDevice(artifact, data))}
                  disabled={Boolean(savingLabel)}
                />
              ))
            ) : (
              <AppButton
                label={savingLabel === '__email_preview__' ? 'Saving recruiter email fallback...' : 'Save recruiter email fallback document'}
                variant="secondary"
                onPress={() =>
                  void handleSaveArtifact('__email_preview__', () =>
                    savePackageArtifactToDevice(
                      {
                        label: 'Recruiter email fallback',
                        type: 'recruiter-email',
                        format: (data.selectedRecruiterEmailExportFormat === 'pdf' ? 'pdf' : 'docx'),
                        fileName: `${data.roleTitle || 'Recruiter_Email'}_Recruiter_Email_Fallback.${data.selectedRecruiterEmailExportFormat === 'pdf' ? 'pdf' : 'docx'}`
                      },
                      data
                    )
                  )
                }
                disabled={Boolean(savingLabel)}
              />
            )}
          </View>
        </View>
      </AppCard>

      {data.exportWarning ? <Text style={{ color: '#FCA5A5' }}>{data.exportWarning}</Text> : null}
      <AppButton label="Choose design templates" variant="secondary" onPress={() => router.push('/(app)/resume/design-studio')} />
      <AppButton label="Open export center" variant="secondary" onPress={() => router.push('/(app)/resume/export-center')} />
    </>
  );
}
