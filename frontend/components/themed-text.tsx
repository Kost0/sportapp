import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { FONT_FAMILY, TEXT_STYLES } from '@/constants/typography';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color, fontFamily: FONT_FAMILY.primary },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? { ...styles.link, color: useThemeColor({ light: lightColor, dark: darkColor }, 'tint') } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    ...TEXT_STYLES.body,
  },
  defaultSemiBold: {
    ...TEXT_STYLES.bodyLg,
  },
  title: {
    ...TEXT_STYLES.display,
  },
  subtitle: {
    ...TEXT_STYLES.h3,
  },
  link: {
    ...TEXT_STYLES.bodyLg,
  },
});
