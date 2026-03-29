import { Pressable, Text } from 'react-native';

import { colors } from '@/src/constants/colors';
import { radii } from '@/src/constants/radii';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function AppButton({ label, onPress, variant = 'primary', disabled = false }: AppButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: isPrimary
          ? (pressed ? colors.primaryPressed : colors.primary)
          : (pressed ? colors.surface : colors.surfaceElevated),
        borderRadius: radii.md,
        paddingVertical: 15,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: isPrimary ? colors.primary : colors.border,
        opacity: disabled ? 0.5 : 1,
        shadowColor: isPrimary ? colors.primary : '#020617',
        shadowOpacity: pressed ? 0.1 : 0.2,
        shadowRadius: isPrimary ? 12 : 10,
        shadowOffset: { width: 0, height: 8 },
        elevation: isPrimary ? 5 : 2
      })}
    >
      <Text style={{ color: isPrimary ? colors.primaryText : colors.text, fontSize: 16, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}
