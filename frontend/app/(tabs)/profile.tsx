import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledBlock } from '@/components/profile/labeled-block';
import { ProfileCard } from '@/components/profile/profile-card';
import { SelectablePill } from '@/components/profile/selectable-pill';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS, getColor } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING, SCREEN } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';
import { ApiError } from '@/lib/api/client';
import { getProfile, updateProfile, type Profile, type ProfileGender } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/auth-context';

const KNOWN_SPORTS = ['Бег', 'Футбол', 'Велосипед'] as const;

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

const formatBirthDate = (iso: string): string => {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

const computeAge = (birthIso: string): number | null => {
  if (!isIsoDate(birthIso)) return null;

  const d = new Date(`${birthIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - d.getUTCFullYear();
  const monthDelta = now.getMonth() - d.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < d.getUTCDate())) years--;
  return years;
};

const pluralYears = (n: number): string => {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'лет';
  if (mod10 === 1) return 'год';
  if (mod10 >= 2 && mod10 <= 4) return 'года';
  return 'лет';
};

export default function ProfileScreen() {
  const { token, logout } = useAuth();
  const colors = getColor();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<ProfileGender>('');
  const [birthDate, setBirthDate] = useState('');
  const [favoriteSports, setFavoriteSports] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // For simple date picker (using modal with date options)
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const p = await getProfile(token);
      setProfile(p);
      setUsername(p.username ?? '');
      setGender(p.gender ?? '');
      setBirthDate(p.birthDate ?? '');
      setFavoriteSports(p.favoriteSports ?? []);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) logout();
        if (e.code === 'PROFILE_NOT_FOUND') {
          setProfile(null);
          setUsername('');
          setGender('');
          setBirthDate('');
          setFavoriteSports([]);
          return;
        }
        setError(`${e.code}: ${e.message}`);
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    void load();
  }, [load]);

  const derivedAge = useMemo(() => {
    if (typeof profile?.age === 'number' && profile.age > 0) return profile.age;
    const computed = computeAge(birthDate.trim());
    return computed;
  }, [profile?.age, birthDate]);

  const birthSummary = useMemo(() => {
    const iso = birthDate.trim();
    if (!isIsoDate(iso)) return null;
    const formatted = formatBirthDate(iso);
    if (derivedAge == null) return formatted;
    return `${derivedAge} ${pluralYears(derivedAge)} • ${formatted}`;
  }, [birthDate, derivedAge]);

  const favoriteOptions = useMemo(() => {
    const known = new Set<string>(KNOWN_SPORTS);
    const extras = (favoriteSports ?? []).filter((s) => s && !known.has(s));
    return [...KNOWN_SPORTS, ...extras];
  }, [favoriteSports]);

  const toggleSport = useCallback((sport: string) => {
    setFavoriteSports((prev) => {
      const set = new Set(prev);
      if (set.has(sport)) set.delete(sport);
      else set.add(sport);
      return Array.from(set);
    });
  }, []);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Сбросить изменения?',
      'Все несохраненные изменения будут потеряны.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сбросить', style: 'destructive', onPress: () => load() },
      ]
    );
  }, [load]);

  const save = useCallback(async () => {
    if (!token) return;

    const name = username.trim();
    if (!name) {
      setError('USERNAME_REQUIRED: Укажите имя/никнейм');
      return;
    }

    const birth = birthDate.trim();
    if (birth && !isIsoDate(birth)) {
      setError('BAD_REQUEST: Дата рождения должна быть в формате YYYY-MM-DD');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateProfile(token, {
        username: name,
        favoriteSports: favoriteSports ?? [],
        ...(gender ? { gender: gender as Exclude<ProfileGender, ''> } : {}),
        ...(birth ? { birthDate: birth } : {}),
      });

      await load();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) logout();
        setError(`${e.code}: ${e.message}`);
      } else {
        setError('Failed to save profile');
      }
    } finally {
      setSaving(false);
    }
  }, [token, username, gender, birthDate, favoriteSports, load, logout]);

  const avatarUrl = profile?.avatarUrl;
  const avatarVisible = Boolean(avatarUrl && /^https?:\/\//.test(avatarUrl));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[TEXT_STYLES.h3, { color: colors.ink }]}>Профиль</Text>
        <View style={styles.headerIcons}>
          <Pressable onPress={load} hitSlop={10} disabled={loading || saving}>
            <MaterialIcons name="refresh" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={logout} hitSlop={10} disabled={saving}>
            <MaterialIcons name="logout" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      {error ? (
        <View style={styles.banner}>
          <Text style={[TEXT_STYLES.bodySm, { color: colors.ink }]}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <ProfileCard style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            {avatarVisible ? (
              <Image source={{ uri: avatarUrl! }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.avatarPlaceholder }]} />
            )}
          </View>
          {loading ? <ActivityIndicator color={colors.textSecondary} /> : null}
        </ProfileCard>

        <ProfileCard style={styles.cardPadded}>
          <LabeledBlock label="Имя / Никнейм">
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Имя"
              placeholderTextColor={colors.inputPlaceholder}
              editable={!saving}
              style={[styles.valueInput, { color: colors.ink, borderBottomColor: colors.border }]}
            />
          </LabeledBlock>
        </ProfileCard>

        <ProfileCard style={styles.cardPadded}>
          <LabeledBlock label="Пол">
            <View style={styles.row}>
              <SelectablePill
                label="Мужской"
                selected={gender === 'MALE'}
                layout="fill"
                disabled={saving}
                onPress={() => setGender('MALE')}
              />
              <SelectablePill
                label="Женский"
                selected={gender === 'FEMALE'}
                layout="fill"
                disabled={saving}
                onPress={() => setGender('FEMALE')}
              />
            </View>
          </LabeledBlock>
        </ProfileCard>

        <ProfileCard style={styles.cardPadded}>
          <LabeledBlock label="Возраст / Дата рождения">
            <Pressable 
              style={[styles.dateInput, { borderBottomColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
              disabled={saving}
            >
              {birthDate ? (
                <Text style={[styles.dateText, { color: colors.ink }]}>
                  {birthSummary}
                </Text>
              ) : (
                <Text style={[styles.dateText, { color: colors.inputPlaceholder }]}>
                  Выберите дату рождения
                </Text>
              )}
              <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
            </Pressable>
          </LabeledBlock>
        </ProfileCard>

        {/* Simple Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Дата рождения</Text>
              <ScrollView style={styles.dateList} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 100 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <View key={year} style={styles.yearSection}>
                      <Text style={styles.yearLabel}>{year}</Text>
                      <View style={styles.monthsRow}>
                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(month => (
                          <Pressable
                            key={month}
                            style={[
                              styles.dayButton,
                              birthDate === `${year}-${month}-01` && styles.dayButtonSelected
                            ]}
                            onPress={() => {
                              const day = month === '02' ? '28' : '15';
                              setBirthDate(`${year}-${month}-${day}`);
                              setShowDatePicker(false);
                            }}
                          >
                            <Text style={[
                              styles.dayButtonText,
                              birthDate === `${year}-${month}-01` && styles.dayButtonTextSelected
                            ]}>
                              {['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][parseInt(month) - 1]}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.modalButtons}>
                <SecondaryButton 
                  title="Отмена" 
                  onPress={() => setShowDatePicker(false)} 
                />
              </View>
            </View>
          </Pressable>
        </Modal>

        <ProfileCard style={styles.cardPadded}>
          <LabeledBlock label="Любимые активности">
            <View style={styles.wrapRow}>
              {favoriteOptions.map((s) => (
                <SelectablePill
                  key={s}
                  label={s}
                  selected={favoriteSports.includes(s)}
                  disabled={saving}
                  onPress={() => toggleSport(s)}
                />
              ))}
            </View>
          </LabeledBlock>
        </ProfileCard>

        <View style={styles.actions}>
          <PrimaryButton title="Сохранить" onPress={save} loading={saving} />
          <SecondaryButton title="Сбросить" onPress={handleReset} disabled={loading || saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  divider: {
    height: 1,
    marginHorizontal: SCREEN.paddingHorizontal,
  },
  banner: {
    marginHorizontal: SCREEN.paddingHorizontal,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  content: {
    paddingHorizontal: SCREEN.paddingHorizontal,
    paddingVertical: SPACING.base,
    paddingBottom: SCREEN.bottomPadding,
    gap: SPACING.base,
  },
  avatarCard: {
    padding: SPACING.base,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarWrap: {
    width: 140,
    height: 140,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.divider,
    overflow: 'hidden',
  },
  avatar: {
    width: 140,
    height: 140,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
  },
  cardPadded: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  valueInput: {
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    ...TEXT_STYLES.input,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  actions: {
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    borderBottomWidth: 1,
  },
  dateText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.base,
  },
  dateList: {
    maxHeight: 400,
  },
  yearSection: {
    marginBottom: SPACING.base,
  },
  yearLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  monthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  dayButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.divider,
  },
  dayButtonSelected: {
    backgroundColor: COLORS.ink,
  },
  dayButtonText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  dayButtonTextSelected: {
    color: COLORS.surface,
  },
  modalButtons: {
    marginTop: SPACING.base,
  },
});
