import { PlaceList } from '@/components/place-list';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateActivityHeader } from '@/components/create-activity/header';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { useCreateActivity } from '@/lib/create-activity-context';

export default function LocationScreen() {
  const router = useRouter();
  const { data, updateData } = useCreateActivity();
  const [choosingPlace, setChoosingPlace] = useState(false);

  const handleNext = () => {
    if (data.address.trim()) {
      router.push('/create-activity/participants' as Href);
    }
  };

  const canProceed = data.address.trim().length >= 5;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <CreateActivityHeader
          step={4}
          totalSteps={6}
          title="Место проведения"
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Адрес *</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="place" size={24} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={data.address}
                onChangeText={(text) => updateData({ address: text, lat: 0, lon: 0 })}
                placeholder="Улица, дом или название места"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <Text style={styles.hint}>Укажите адрес или название места проведения</Text>
          </View>

          <PrimaryButton title="Выбрать существующее место" onPress={() => setChoosingPlace(true)} />
          <Text style={styles.hint}>Можно выбрать площадку или повторно использовать адрес другой активности.</Text>

          <View style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>Примеры:</Text>
            <View style={styles.examplesList}>
              <Text style={styles.exampleItem}>• Парк Горького, у фонтана</Text>
              <Text style={styles.exampleItem}>• ул. Ленина, 15, спортзал</Text>
              <Text style={styles.exampleItem}>• Стадион Динамо, поле №2</Text>
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
              disabled={!canProceed}
              style={styles.nextButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={choosingPlace} transparent animationType="slide" onRequestClose={() => setChoosingPlace(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Закрыть выбор места" onPress={() => setChoosingPlace(false)} />
          <View style={styles.sheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.label}>Выберите место</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Отмена выбора места" onPress={() => setChoosingPlace(false)} style={styles.close}>
                <MaterialIcons name="close" size={24} color={COLORS.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
              {choosingPlace && <PlaceList picking onSelect={place => {
                updateData({ address: place.demo ? `${place.name}, ${place.address}` : place.address, lat: place.lat ?? 0, lon: place.lon ?? 0 });
                setChoosingPlace(false);
              }} />}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { height: '85%', backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  examplesSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  examplesList: {
    gap: 6,
  },
  exampleItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
