import { Image, Text, View } from 'react-native';

import { colors } from '@/src/constants/colors';
import { DailyEncouragement } from '@/src/components/ui/DailyEncouragement';

const brandIcon = require('../../../assets/icon.png');

export function BrandHero({ subtitle }: { subtitle: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 14, marginBottom: 8 }}>
      <DailyEncouragement />
      <Image source={brandIcon} style={{ width: 120, height: 120, borderRadius: 28 }} resizeMode="contain" />
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 34, fontWeight: '900', color: colors.text }}>JOBNOVA</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: 'center' }}>{subtitle}</Text>
      </View>
    </View>
  );
}
