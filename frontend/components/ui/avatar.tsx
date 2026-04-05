/**
 * Avatar — user avatar component with fallback placeholder.
 */

import React from 'react';
import { Image, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { RADIUS } from '@/constants/radius';
import { TEXT_STYLES } from '@/constants/typography';

type AvatarProps = ViewProps & {
  /** Avatar image URL */
  source?: string | null;
  /** Avatar size in pixels */
  size?: number;
  /** Fallback initials to display when no image */
  initials?: string;
  /** Border width */
  borderWidth?: number;
  colorScheme?: ColorScheme;
};

export function Avatar({
  source,
  size = 40,
  initials,
  borderWidth = 1.5,
  colorScheme,
  style,
  ...rest
}: AvatarProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const hasImage = Boolean(source && /^https?:\/\//.test(source));
  const radius = size / 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth,
          borderColor: colors.avatarBorder,
          backgroundColor: hasImage ? 'transparent' : colors.avatarPlaceholder,
        },
        style,
      ]}
      {...rest}
    >
      {hasImage ? (
        <Image
          source={{ uri: source! }}
          style={{ width: '100%', height: '100%', borderRadius: radius }}
        />
      ) : initials ? (
        <Text
          style={[
            TEXT_STYLES.accentBold,
            {
              fontSize: size * 0.35,
              color: colors.textSecondary,
            },
          ]}
        >
          {initials.toUpperCase().slice(0, 2)}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * AvatarStack — overlapping avatars for participant lists.
 */

export type AvatarStackItem = {
  id: string;
  avatarUrl?: string | null;
  initials?: string;
};

type AvatarStackProps = {
  items: AvatarStackItem[];
  size?: number;
  max?: number;
  colorScheme?: ColorScheme;
};

export function AvatarStack({ items, size = 36, max = 3, colorScheme }: AvatarStackProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const visible = items.slice(0, max);
  const extra = Math.max(items.length - visible.length, 0);
  const overlap = Math.round(size * 0.24);

  return (
    <View style={styles.row}>
      {visible.map((item, idx) => (
        <Avatar
          key={item.id}
          source={item.avatarUrl}
          initials={item.initials}
          size={size}
          colorScheme={scheme}
          style={{ marginLeft: idx === 0 ? 0 : -overlap }}
        />
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.extraBadge,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: visible.length === 0 ? 0 : -overlap,
              borderWidth: 1.5,
              borderColor: colors.avatarBorder,
              backgroundColor: colors.divider,
            },
          ]}
        >
          <Text style={[TEXT_STYLES.labelSm, { color: colors.textPrimary }]}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extraBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
