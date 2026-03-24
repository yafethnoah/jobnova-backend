import { Text, TextInput, View } from 'react-native';

import { colors } from '@/src/constants/colors';
import { radii } from '@/src/constants/radii';

type AppInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  multiline?: boolean;
  error?: string;
};

export function AppInput({ label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize = 'none', keyboardType = 'default', multiline = false, error }: AppInputProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          paddingHorizontal: 14,
          paddingVertical: 14,
          minHeight: multiline ? 130 : undefined,
          fontSize: 16,
          color: colors.text,
          shadowColor: '#020617',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1
        }}
      />
      {error ? <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}
