import { Pressable, Text, View } from 'react-native';
import { colors } from '@/src/constants/colors';
import { radii } from '@/src/constants/radii';

type Option = { label: string; value: string; sublabel?: string };

type SelectionChipsProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function SelectionChips({ label, value, options, onChange }: SelectionChipsProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => ({
                minWidth: 112,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : pressed ? colors.surface : colors.surfaceElevated,
                opacity: pressed ? 0.9 : 1
              })}
            >
              <Text style={{ color: selected ? colors.primaryText : colors.text, fontSize: 13, fontWeight: '800' }}>{option.label}</Text>
              {option.sublabel ? (
                <Text style={{ marginTop: 4, color: selected ? '#E9ECFF' : colors.subtle, fontSize: 12, lineHeight: 16 }}>{option.sublabel}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
