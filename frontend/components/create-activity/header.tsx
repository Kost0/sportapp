import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  step: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
};

export function CreateActivityHeader({ step, totalSteps, title, onBack }: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={handleBack} hitSlop={10} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.stepText}>Шаг {step} из {totalSteps}</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index < step ? styles.progressDotActive : styles.progressDotInactive,
            ]}
          />
        ))}
      </View>
      
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: COLORS.bg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  placeholder: {
    width: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: COLORS.ink,
  },
  progressDotInactive: {
    backgroundColor: COLORS.divider,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});
