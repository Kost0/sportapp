import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateActivityHeader } from '@/components/create-activity/header';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { useCreateActivity } from '@/lib/create-activity-context';

const TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

const formatDate = (date: Date): string => {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const day = days[date.getDay()];
  const dateNum = date.getDate();
  const month = months[date.getMonth()];
  return `${day}, ${dateNum} ${month}`;
};

const getNext7Days = (): Date[] => {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }
  return days;
};

export default function DateTimeScreen() {
  const router = useRouter();
  const { data, updateData } = useCreateActivity();
  const [showTimePicker, setShowTimePicker] = useState(false);

  const days = getNext7Days();

  const handleSelectDate = (date: Date) => {
    updateData({ date });
  };

  const handleSelectTime = (time: string) => {
    updateData({ time });
    setShowTimePicker(false);
  };

  const handleNext = () => {
    if (data.date && data.time) {
      router.push('/create-activity/location' as Href);
    }
  };

  const isSameDay = (d1: Date, d2: Date | null): boolean => {
    if (!d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const canProceed = data.date !== null && data.time !== '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <CreateActivityHeader
        step={3}
        totalSteps={5}
        title="Дата и время"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Выберите день</Text>
          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const isSelected = isSameDay(day, data.date);
              const isToday = index === 0;
              return (
                <Pressable
                  key={day.toISOString()}
                  style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                  onPress={() => handleSelectDate(day)}
                >
                  <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected]}>
                    {day.getDate()}
                  </Text>
                  <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                    {isToday ? 'Сегодня' : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][day.getDay()]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Выберите время</Text>
          <Pressable
            style={styles.timeSelector}
            onPress={() => setShowTimePicker(true)}
          >
            <MaterialIcons name="access-time" size={24} color={COLORS.ink} />
            <Text style={styles.timeText}>{data.time || 'Выбрать время'}</Text>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        {data.date && (
          <View style={styles.summaryCard}>
            <MaterialIcons name="event" size={24} color={COLORS.ink} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Запланировано на:</Text>
              <Text style={styles.summaryValue}>
                {formatDate(data.date)} в {data.time}
              </Text>
            </View>
          </View>
        )}
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
            disabled={!canProceed}
            style={styles.nextButton}
          />
        </View>
      </View>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowTimePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите время</Text>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.timeList}>
              {TIMES.map((time) => (
                <Pressable
                  key={time}
                  style={[
                    styles.timeItem,
                    data.time === time && styles.timeItemSelected,
                  ]}
                  onPress={() => handleSelectTime(time)}
                >
                  <Text
                    style={[
                      styles.timeItemText,
                      data.time === time && styles.timeItemTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayCard: {
    width: '13%',
    aspectRatio: 0.8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  dayCardSelected: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  dayTextSelected: {
    color: COLORS.surface,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.badgeText,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timeList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  timeItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  timeItemSelected: {
    backgroundColor: COLORS.ink,
  },
  timeItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  timeItemTextSelected: {
    color: COLORS.surface,
  },
});
