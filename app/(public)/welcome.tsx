import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

function CTA({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: secondary ? '#172644' : '#6F86FF',
        borderRadius: 14,
        paddingVertical: 15,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: secondary ? '#27385F' : '#6F86FF',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

export default function WelcomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#08111F', padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 34, fontWeight: '800', color: '#F8FAFF' }}>JobNova</Text>
      <Text style={{ fontSize: 18, lineHeight: 28, color: '#B8C4E4', marginTop: 12 }}>
        A calmer, smarter way to move from job searching to job readiness.
      </Text>
      <View style={{ marginTop: 24, gap: 12 }}>
        <CTA label="Create account" onPress={() => router.push('/(public)/register')} />
        <CTA label="Sign in" secondary onPress={() => router.push('/(public)/login')} />
      </View>
    </View>
  );
}
