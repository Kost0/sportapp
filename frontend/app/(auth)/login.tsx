import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectablePill } from '@/components/profile/selectable-pill';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { ApiError } from '@/lib/api/client';
import { getApiBaseUrl } from '@/lib/api/config';
import { useAuth } from '@/lib/auth/auth-context';

const BORDER = '#E5E7EB';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = useMemo(() => getApiBaseUrl(), []);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, username.trim() || 'user');
      }
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(`${e.code}: ${e.message}`);
      } else {
        setError('Unexpected error');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SportPoint</Text>
        <Text style={styles.headerSubtitle}>{mode === 'login' ? 'Вход' : 'Регистрация'}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.modeRow}>
              <SelectablePill
                label="Вход"
                selected={mode === 'login'}
                layout="fill"
                disabled={busy}
                onPress={() => setMode('login')}
              />
              <SelectablePill
                label="Регистрация"
                selected={mode === 'register'}
                layout="fill"
                disabled={busy}
                onPress={() => setMode('register')}
              />
            </View>

            <Text style={styles.apiHint}>API: {baseUrl}</Text>

            <View style={styles.fields}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                editable={!busy}
                returnKeyType="next"
              />

              {mode === 'register' ? (
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Никнейм"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                  editable={!busy}
                  returnKeyType="next"
                />
              ) : null}

              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Пароль"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
              />
            </View>

            {error ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <PrimaryButton
                title={mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                onPress={() => void submit()}
                loading={busy}
              />
              <SecondaryButton
                title={mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}
                onPress={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
                disabled={busy}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(41, 49, 62, 0.06)',
    gap: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  apiHint: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  fields: {
    gap: 10,
  },
  input: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: BORDER,
    fontSize: 14,
    fontWeight: '600',
  },
  banner: {
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
  actions: {
    gap: 10,
  },
});
