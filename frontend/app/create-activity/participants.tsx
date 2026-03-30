import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateActivityHeader } from '@/components/create-activity/header';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { useCreateActivity } from '@/lib/create-activity-context';

const PRESETS = [2, 4, 6, 8, 10, 12, 15, 20];

export default function ParticipantsScreen() {
  const router = useRouter();
  const { data, updateData } = useCreateActivity();

  const handleIncrement = () => {
    if (data.maxParticipants < 50) {
      updateData({ maxParticipants: data.maxParticipants + 1 });
    }
  };

  const handleDecrement = () => {
    if (data.maxParticipants > 2) {
      updateData({ maxParticipants: data.maxParticipants - 1 });
    }
  };

  const handlePreset = (value: number) => {
    updateData({ maxParticipants: value });
  };

  const handleNext = () => {
    router.push('/create-activity/confirm' as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <CreateActivityHeader
        step={5}
        totalSteps={5}
        title="Количество участников"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.counterSection}>
          <Text style={styles.label}>Максимум участников</Text>
          <View style={styles.counter}>
            <Pressable
              style={[styles.counterButton, data.maxParticipants <= 2 && styles.counterButtonDisabled]}
              onPress={handleDecrement}
              disabled={data.maxParticipants <= 2}
            >
              <MaterialIcons
                name="remove"
                size={28}
                color={data.maxParticipants <= 2 ? COLORS.divider : COLORS.ink}
              />
            </Pressable>
            
            <View style={styles.counterValue}>
              <Text style={styles.counterNumber}>{data.maxParticipants}</Text>
              <Text style={styles.counterLabel}>человек</Text>
            </View>
            
            <Pressable
              style={[styles.counterButton, data.maxParticipants >= 50 && styles.counterButtonDisabled]}
              onPress={handleIncrement}
              disabled={data.maxParticipants >= 50}
            >
              <MaterialIcons
                name="add"
                size={28}
                color={data.maxParticipants >= 50 ? COLORS.divider : COLORS.ink}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.presetsSection}>
          <Text style={styles.presetsTitle}>Быстрый выбор</Text>
          <View style={styles.presetsGrid}>
            {PRESETS.map((value) => (
              <Pressable
                key={value}
                style={[
                  styles.presetButton,
                  data.maxParticipants === value && styles.presetButtonSelected,
                ]}
                onPress={() => handlePreset(value)}
              >
                <Text
                  style={[
                    styles.presetText,
                    data.maxParticipants === value && styles.presetTextSelected,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.hintCard}>
          <MaterialIcons name="people" size={24} color={COLORS.badgeText} />
          <View style={styles.hintContent}>
            <Text style={styles.hintTitle}>Включая вас</Text>
            <Text style={styles.hintText}>
              Вы автоматически станете организатором и будете включены в число участников
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <SecondaryButton
            title="Назад"
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <PrimaryButton
            title="Далее"
            onPress={handleNext}
            style={styles.nextButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 32,
  },
  counterSection: {
    alignItems: 'center',
    gap: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C1A4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  counterButtonDisabled: {
    opacity: 0.5,
  },
  counterValue: {
    alignItems: 'center',
    minWidth: 100,
  },
  counterNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.ink,
  },
  counterLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: -4,
  },
  presetsSection: {
    gap: 12,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  presetButton: {
    width: 60,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  presetButtonSelected: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  presetText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  presetTextSelected: {
    color: COLORS.surface,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  hintContent: {
    flex: 1,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.badgeText,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.bg,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
