import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateActivityHeader } from '@/components/create-activity/header';
import { SportIcon } from '@/components/sport-icon';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { createActivity } from '@/lib/api/activities';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useCreateActivity, type SportType } from '@/lib/create-activity-context';

const SPORT_LABELS: Record<SportType, string> = {
  basketball: 'Баскетбол',
  football: 'Футбол',
  volleyball: 'Волейбол',
  tennis: 'Теннис',
  badminton: 'Бадминтон',
  running: 'Бег',
  cycling: 'Велосипед',
  swimming: 'Плавание',
  parkour: 'Паркур',
  other: 'Другое',
};

const formatDate = (date: Date): string => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${days[date.getDay()]}`;
};

export default function ConfirmScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const { data, resetData } = useCreateActivity();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!token || !data.date || !data.sport) return;

    setLoading(true);
    setError(null);

    try {
      const [hours, minutes] = data.time.split(':').map(Number);
      const dateTime = new Date(data.date);
      dateTime.setHours(hours, minutes, 0, 0);

      await createActivity(token, {
        title: data.title,
        sport: data.sport,
        description: data.description,
        date: dateTime.toISOString(),
        address: data.address,
        lat: data.lat,
        lon: data.lon,
        maxParticipants: data.maxParticipants,
      });

      resetData();
      Alert.alert(
        'Активность создана!',
        'Ваша активность успешно опубликована',
        [
          {
            text: 'Отлично',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          logout();
          return;
        }
        setError(`${e.code}: ${e.message}`);
      } else {
        setError('Не удалось создать активность');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <CreateActivityHeader
        step={5}
        totalSteps={5}
        title="Подтверждение"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.sportBadge}>
              <SportIcon sport={data.sport || ''} size={24} color={COLORS.surface} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.sportName}>{data.sport ? SPORT_LABELS[data.sport] : ''}</Text>
              <Text style={styles.title}>{data.title}</Text>
            </View>
          </View>

          {data.description ? (
            <Text style={styles.description}>{data.description}</Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={20} color={COLORS.ink} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Дата и время</Text>
              <Text style={styles.infoValue}>
                {data.date ? formatDate(data.date) : ''} в {data.time}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="place" size={20} color={COLORS.ink} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Место</Text>
              <Text style={styles.infoValue}>{data.address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="people" size={20} color={COLORS.ink} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Участники</Text>
              <Text style={styles.infoValue}>до {data.maxParticipants} человек</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <MaterialIcons name="check-circle" size={20} color={COLORS.badgeText} />
          <Text style={styles.infoCardText}>
            После создания активность сразу станет видна другим пользователям
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <SecondaryButton
            title="Назад"
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={loading}
          />
          <PrimaryButton
            title="Создать"
            onPress={handleCreate}
            loading={loading}
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
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#0C1A4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sportBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  sportName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: 'rgba(240, 86, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240, 86, 87, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  infoCardText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
});
