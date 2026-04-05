/**
 * AppText — typography-aware text component using Montserrat.
 * Replaces ThemedText with proper font family, size scale, and dark mode support.
 */

import React from 'react';
import { Text, type TextProps, StyleSheet } from 'react-native';

import { getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES, type TextStyleName } from '@/constants/typography';

type AppTextProps = TextProps & {
  /** Preset text style */
  variant?: TextStyleName;
  /** Override text color */
  color?: string;
  colorScheme?: ColorScheme;
};

export function AppText({
  variant = 'body',
  color,
  colorScheme,
  style,
  ...rest
}: AppTextProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const textStyle = TEXT_STYLES[variant];

  return (
    <Text
      style={[
        { color: color ?? colors.textPrimary },
        textStyle,
        style,
      ]}
      {...rest}
    />
  );
}

/**
 * Shorthand variants for common use cases.
 */
export function Heading({ style, ...rest }: Omit<AppTextProps, 'variant'>) {
  return <AppText variant="h2" style={style} {...rest} />;
}

export function Subheading({ style, ...rest }: Omit<AppTextProps, 'variant'>) {
  return <AppText variant="h3" style={style} {...rest} />;
}

export function BodyText({ style, ...rest }: Omit<AppTextProps, 'variant'>) {
  return <AppText variant="body" style={style} {...rest} />;
}

export function Caption({ style, ...rest }: Omit<AppTextProps, 'variant'>) {
  return <AppText variant="bodySm" style={style} {...rest} />;
}

export function Label({ style, ...rest }: Omit<AppTextProps, 'variant'>) {
  return <AppText variant="label" style={style} {...rest} />;
}
