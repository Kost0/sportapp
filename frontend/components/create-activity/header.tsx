import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';

type Props = {
  step: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
  colorScheme?: ColorScheme;
};

export function CreateActivityHeader({ step, totalSteps, title, onBack, colorScheme }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 12) + 8 }]}>
      <View style={styles.topRow}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={[TEXT_STYLES.label, { color: colors.textSecondary }]}>
          Шаг {step} из {totalSteps}
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor: index < step ? colors.progressDotActive : colors.progressDotInactive,
              },
            ]}
          />
        ))}
      </View>
      
      <Text style={[TEXT_STYLES.h2, { color: colors.textPrimary, textAlign: 'center' }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
  },
  placeholder: {
    width: 36,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.base,
    marginBottom: SPACING.base,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
});
