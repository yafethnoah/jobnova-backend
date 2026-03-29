import { View } from 'react-native';

import { colors } from '@/src/constants/colors';
import { radii } from '@/src/constants/radii';

export function AppCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#020617',
        shadowOpacity: 0.24,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6
      }}
    >
      {children}
    </View>
  );
}
