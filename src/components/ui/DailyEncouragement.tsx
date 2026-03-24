
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { usePathname } from 'expo-router';

import { colors } from '@/src/constants/colors';
import { radii } from '@/src/constants/radii';
import { generateDailyEncouragement } from '@/src/lib/dailyEncouragement';

export function DailyEncouragement() {
  const pathname = usePathname();
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setQuote(generateDailyEncouragement(pathname || 'screen'));
  }, [pathname]);

  return (
    <View
      style={{
        backgroundColor: colors.surfaceElevated,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#020617',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3
      }}
    >
      <Text style={{ color: colors.primarySoft, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' }}>
        Daily Encouragement
      </Text>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22, marginTop: 6 }}>
        {quote}
      </Text>
    </View>
  );
}
