import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { useCachedJson } from '@/src/hooks/useCachedJson';
import { JOB_READY_PACKAGE_CACHE_KEY } from '@/src/features/resume/resume.cache';
import type { JobReadyPackage } from '@/src/features/resume/jobReady.types';
import { env } from '@/src/lib/env';
import { saveFullPackageToDevice, savePackageArtifactToDevice } from '@/src/lib/packageDownloads';

export default function ExportCenterScreen() {
  const { data } = useCachedJson<JobReadyPackage>(JOB_READY_PACKAGE_CACHE_KEY);
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const artifacts = useMemo(() => (Array.isArray(data?.exportArtifacts) ? data?.exportArtifacts : []).map((item) => ({
    ...item,
    downloadUrl: item.downloadUrl || (env.apiBaseUrl ? `${env.apiBaseUrl}/downloads/${item.fileName}` : undefined)
  })), [data]);

  async function handleSave(label: string, action: () => Promise<unknown>) {
    try {
      setSavingLabel(label);
      await action();
    } finally {
      setSavingLabel(null);
    }
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Export center</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Save the latest tailored package directly to the device. In live mode, backend-generated DOCX and PDF files are downloaded first and then handed to the iPhone share sheet.
      </Text>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Full package</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          <AppButton
            label={savingLabel === '__full__' ? 'Saving full package...' : 'Save full tailored package'}
            onPress={() => data ? void handleSave('__full__', () => saveFullPackageToDevice(data)) : undefined}
            disabled={!data || Boolean(savingLabel)}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Generated files</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {artifacts.map((file) => (
            <AppButton
              key={file.fileName}
              label={savingLabel === file.fileName ? `Saving ${file.label}...` : `${file.label} • ${file.fileName}`}
              variant="secondary"
              onPress={() => data ? void handleSave(file.fileName, () => savePackageArtifactToDevice(file, data)) : undefined}
              disabled={!data || Boolean(savingLabel)}
            />
          ))}
          {!artifacts.length ? <Text style={{ color: '#6B7280' }}>Generate the package first, then save the files here.</Text> : null}
        </View>
      </AppCard>
    </AppScreen>
  );
}
