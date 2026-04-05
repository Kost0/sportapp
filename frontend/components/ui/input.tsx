/**
 * Input — styled text input component with label and optional helper text.
 */

import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  View,
} from 'react-native';

import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { TEXT_STYLES } from '@/constants/typography';

type InputProps = RNTextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  colorScheme?: ColorScheme;
};

export const Input = forwardRef<RNTextInput, InputProps>(function Input(
  { label, helper, error, colorScheme, style, ...rest },
  ref,
) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const hasError = Boolean(error);

  return (
    <View style={styles.root}>
      {label ? (
        <Text style={[TEXT_STYLES.label, { color: colors.textSecondary, marginBottom: 6 }]}>
          {label}
        </Text>
      ) : null}
      <RNTextInput
        ref={ref}
        placeholderTextColor={colors.inputPlaceholder}
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: hasError ? colors.danger : colors.inputBorder,
            color: colors.textPrimary,
          },
          style,
        ]}
        {...rest}
      />
      {hasError ? (
        <Text style={[TEXT_STYLES.bodySm, { color: colors.danger, marginTop: 4 }]}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={[TEXT_STYLES.bodySm, { color: colors.textSecondary, marginTop: 4 }]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    fontSize: TEXT_STYLES.input.fontSize,
    fontFamily: TEXT_STYLES.input.fontFamily,
    lineHeight: TEXT_STYLES.input.lineHeight,
  },
});
