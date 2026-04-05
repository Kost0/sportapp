import { useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { CreateActivityHeader } from '@/components/create-activity/header';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { useCreateActivity } from '@/lib/create-activity-context';

export default function DetailsScreen() {
  const router = useRouter();
  const { data, updateData } = useCreateActivity();

  const handleNext = () => {
    if (data.title.trim()) {
      router.push('/create-activity/datetime' as Href);
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      updateData({ imageUri: result.assets[0].uri });
    }
  };

  const canProceed = data.title.trim().length >= 3;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <CreateActivityHeader
          step={2}
          totalSteps={5}
          title="Название и описание"
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Название активности *</Text>
            <TextInput
              style={styles.input}
              value={data.title}
              onChangeText={(text) => updateData({ title: text })}
              placeholder="Например: Вечерний баскетбол"
              placeholderTextColor={COLORS.textSecondary}
              maxLength={100}
            />
            <Text style={styles.hint}>Минимум 3 символа</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={data.description}
              onChangeText={(text) => updateData({ description: text })}
              placeholder="Расскажите подробнее об активности..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.hint}>{data.description.length}/500</Text>
          </View>

          <View style={styles.sportBadge}>
            <Text style={styles.sportBadgeLabel}>Вид спорта:</Text>
            <Text style={styles.sportBadgeValue}>{data.sport}</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Изображение</Text>
            <Pressable onPress={handleImagePick} style={styles.imagePickerContainer}>
              {data.imageUri ? (
                <Image source={{ uri: data.imageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Text style={styles.imagePickerText}>+ Добавить изображение</Text>
                </View>
              )}
            </Pressable>
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
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sportBadgeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sportBadgeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
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
  imagePickerContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  imagePickerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
