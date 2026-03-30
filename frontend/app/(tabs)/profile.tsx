import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { COLORS } from '@/constants/colors';
import { ApiError } from '@/lib/api/client';
import { getProfile, updateProfile, type Profile, type ProfileGender } from '@/lib/api/profile';
import { useAuth } from '@/lib/auth/auth-context';

const BORDER = '#E5E7EB';
const AVATAR_BG = '#E5E7EB';
const AVATAR_BORDER = '#ECEFF2';

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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<ProfileGender>('');
  const [birthDate, setBirthDate] = useState('');
  const [favoriteSports, setFavoriteSports] = useState<string[]>([]);

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
        <Text style={styles.headerTitle}>Профиль</Text>
        <View style={styles.headerIcons}>
          <Pressable onPress={load} hitSlop={10} disabled={loading || saving}>
            <MaterialIcons name="refresh" size={20} color={COLORS.textSecondary} />
          </Pressable>
          <Pressable onPress={logout} hitSlop={10} disabled={saving}>
            <MaterialIcons name="logout" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </View>
      <View style={styles.divider} />

      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <ProfileCard style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            {avatarVisible ? (
              <Image source={{ uri: avatarUrl! }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
          {loading ? <ActivityIndicator color={COLORS.textSecondary} /> : null}
        </ProfileCard>

        <ProfileCard style={styles.cardPadded}>
          <LabeledBlock label="Имя / Никнейм">
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Имя"
              placeholderTextColor={COLORS.textSecondary}
              editable={!saving}
              style={styles.valueInput}
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
            <TextInput
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="2001-03-12"
              placeholderTextColor={COLORS.textSecondary}
              editable={!saving}
              style={styles.valueInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {birthSummary ? <Text style={styles.helper}>{birthSummary}</Text> : null}
          </LabeledBlock>
        </ProfileCard>

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
          <SecondaryButton title="Сбросить" onPress={load} disabled={loading || saving} />
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 24,
  },
  banner: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(240, 86, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240, 86, 87, 0.25)',
  },
  bannerText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 32,
    gap: 16,
  },
  avatarCard: {
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: AVATAR_BG,
    borderWidth: 1,
    borderColor: AVATAR_BORDER,
    overflow: 'hidden',
  },
  avatar: {
    width: 160,
    height: 160,
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: AVATAR_BG,
  },
  cardPadded: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  valueInput: {
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  helper: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actions: {
    gap: 10,
    paddingTop: 6,
  },
});
