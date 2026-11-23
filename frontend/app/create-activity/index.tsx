import { SPORTS } from '@/constants/sports';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateActivityHeader } from '@/components/create-activity/header';
import { PrimaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { useCreateActivity, type SportType } from '@/lib/create-activity-context';



export default function SelectSportScreen() {
  const router = useRouter();
  const { data, updateData, resetData } = useCreateActivity();

  const handleSelect = (sport: SportType) => {
    updateData({ sport });
  };

  const handleNext = () => {
    if (data.sport) {
      router.push('/create-activity/details' as Href);
    }
  };

  const handleBack = () => {
    resetData();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <CreateActivityHeader
        step={1}
        totalSteps={6}
        title="Выберите вид спорта"
        onBack={handleBack}
      />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {SPORTS.map((sport) => {
            const isSelected = data.sport === sport.id;
            return (
              <Pressable
                key={sport.id}
                accessibilityRole="button"
                accessibilityLabel={sport.label}
                accessibilityState={{ selected: isSelected }}
                style={[styles.sportCard, isSelected && styles.sportCardSelected]}
                onPress={() => handleSelect(sport.id)}
              >
                <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                  <MaterialIcons
                    name={sport.icon}
                    size={32}
                    color={isSelected ? COLORS.surface : COLORS.ink}
                  />
                </View>
                <Text style={[styles.sportLabel, isSelected && styles.sportLabelSelected]}>
                  {sport.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Далее"
          onPress={handleNext}
          disabled={!data.sport}
        />
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
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  sportCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0C1A4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sportCardSelected: {
    backgroundColor: COLORS.ink,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  sportLabelSelected: {
    color: COLORS.surface,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.bg,
  },
});
