import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { useAuth } from '@/src/features/auth/useAuth';
import { jobReadyApi } from '@/src/api/jobReady';
import type { ExportArtifact } from '@/src/features/resume/jobReady.types';
import { env } from '@/src/lib/env';
import { downloadRemoteFileToDevice } from '@/src/lib/packageDownloads';

export default function ExportLibraryScreen() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ExportArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingLabel, setSavingLabel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    jobReadyApi.exportLibrary(accessToken)
      .then((data) => {
        if (!active) return;
        setItems((Array.isArray(data) ? data : []).map((item) => ({
          ...item,
          downloadUrl: item.downloadUrl || (env.apiBaseUrl ? `${env.apiBaseUrl}/downloads/${item.fileName}` : undefined)
        })));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [accessToken]);

  async function handleSave(file: ExportArtifact) {
    if (!file.downloadUrl) return;
    try {
      setSavingLabel(file.id || file.fileName);
      await downloadRemoteFileToDevice(file.downloadUrl, file.fileName);
    } finally {
      setSavingLabel(null);
    }
  }

  return (
    <AppScreen>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }}>Saved export library</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: '#96A7DE' }}>
        Your generated resumes and cover letters live here instead of evaporating into the software mist. Tap any file to save it back onto the phone.
      </Text>
      <AppCard>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Library</Text>
        <View style={{ marginTop: 12, gap: 10 }}>
          {loading ? <Text style={{ color: '#C8D3F5' }}>Loading library...</Text> : null}
          {!loading && !items.length ? <Text style={{ color: '#6B7280' }}>No saved export files yet. Generate a job-ready package first.</Text> : null}
          {items.map((file) => (
            <AppButton
              key={file.id || file.fileName}
              label={savingLabel === (file.id || file.fileName) ? `Saving ${file.label}...` : `${file.targetRole || 'Resume'} • ${file.label}`}
              variant="secondary"
              onPress={() => void handleSave(file)}
              disabled={!file.downloadUrl || Boolean(savingLabel)}
            />
          ))}
        </View>
      </AppCard>
    </AppScreen>
  );
}
