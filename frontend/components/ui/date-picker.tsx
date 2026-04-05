/**
 * DatePickerSimple — simplified date picker for birth date selection.
 * Shows only year + month (not full calendar), much simpler UX.
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

type DatePickerSimpleProps = {
  /** Current selected date (YYYY-MM-DD) */
  value: string;
  /** Callback when date is selected */
  onChange: (date: string) => void;
  /** Whether the picker is visible */
  visible: boolean;
  /** Callback to close the picker */
  onClose: () => void;
  /** Minimum year (e.g., 1950) */
  minYear?: number;
  /** Maximum year (e.g., current year) */
  maxYear?: number;
  /** Color scheme */
  colorScheme?: ColorScheme;
};

const MONTHS = [
  { value: '01', label: 'Январь' },
  { value: '02', label: 'Февраль' },
  { value: '03', label: 'Март' },
  { value: '04', label: 'Апрель' },
  { value: '05', label: 'Май' },
  { value: '06', label: 'Июнь' },
  { value: '07', label: 'Июль' },
  { value: '08', label: 'Август' },
  { value: '09', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' },
  { value: '11', label: 'Ноябрь' },
  { value: '12', label: 'Декабрь' },
];

export function DatePickerSimple({
  value,
  onChange,
  visible,
  onClose,
  minYear = 1950,
  maxYear,
  colorScheme,
}: DatePickerSimpleProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const currentYear = maxYear || new Date().getFullYear();

  // Parse current value
  const current = useMemo(() => {
    if (!value) return { year: currentYear - 25, month: '01' };
    const [year, month] = value.split('-');
    return { year: parseInt(year, 10), month: month || '01' };
  }, [value, currentYear]);

  const [selectedYear, setSelectedYear] = useState(current.year);
  const [selectedMonth, setSelectedMonth] = useState(current.month);

  // Generate year range (last 100 years from max)
  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear; y >= minYear; y--) {
      arr.push(y);
    }
    return arr;
  }, [currentYear, minYear]);

  const handleSelect = () => {
    // Default to 15th of selected month
    const day = selectedMonth === '02' ? '28' : '15';
    const dateStr = `${selectedYear}-${selectedMonth}-${day}`;
    onChange(dateStr);
    onClose();
  };

  const handleClear = () => {
    onChange('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.content, { backgroundColor: colors.surface }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[TEXT_STYLES.h3, { color: colors.textPrimary }]}>
              Дата рождения
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Year Selection */}
          <View style={styles.selectionSection}>
            <Text style={[TEXT_STYLES.label, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
              Год
            </Text>
            <ScrollView 
              style={styles.yearScroll} 
              showsVerticalScrollIndicator={false}
              snapToInterval={44}
              decelerationRate="fast"
            >
              {years.map((year) => (
                <Pressable
                  key={year}
                  style={[
                    styles.yearItem,
                    selectedYear === year && styles.yearItemSelected,
                    { 
                      backgroundColor: selectedYear === year ? colors.ink : 'transparent',
                      borderColor: selectedYear === year ? colors.ink : colors.divider,
                    },
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text
                    style={[
                      TEXT_STYLES.body,
                      { 
                        color: selectedYear === year ? colors.textInverse : colors.textPrimary,
                        fontWeight: selectedYear === year ? '600' : '400',
                      },
                    ]}
                  >
                    {year}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Month Selection */}
          <View style={styles.selectionSection}>
            <Text style={[TEXT_STYLES.label, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
              Месяц
            </Text>
            <View style={styles.monthGrid}>
              {MONTHS.map((month) => (
                <Pressable
                  key={month.value}
                  style={[
                    styles.monthItem,
                    selectedMonth === month.value && styles.monthItemSelected,
                    { 
                      backgroundColor: selectedMonth === month.value ? colors.ink : colors.inkLight,
                      borderColor: selectedMonth === month.value ? colors.ink : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedMonth(month.value)}
                >
                  <Text
                    style={[
                      TEXT_STYLES.labelSm,
                      { 
                        color: selectedMonth === month.value ? colors.textInverse : colors.textPrimary,
                      },
                    ]}
                  >
                    {month.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.clearBtn, { borderColor: colors.divider }]}
              onPress={handleClear}
            >
              <Text style={[TEXT_STYLES.label, { color: colors.textSecondary }]}>
                Очистить
              </Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: colors.ink }]}
              onPress={handleSelect}
            >
              <Text style={[TEXT_STYLES.label, { color: colors.textInverse }]}>
                Подтвердить
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * DatePickerInput — input field that opens the date picker.
 */

type DatePickerInputProps = {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  colorScheme?: ColorScheme;
};

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

const formatBirthDate = (iso: string): string => {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'Выберите дату',
  colorScheme,
}: DatePickerInputProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const [showPicker, setShowPicker] = useState(false);

  const displayValue = value ? formatBirthDate(value) : '';

  return (
    <>
      <Pressable 
        style={[styles.input, { borderBottomColor: colors.border }]}
        onPress={() => setShowPicker(true)}
      >
        {displayValue ? (
          <Text style={[TEXT_STYLES.body, { color: colors.textPrimary }]}>
            {displayValue}
          </Text>
        ) : (
          <Text style={[TEXT_STYLES.body, { color: colors.inputPlaceholder }]}>
            {placeholder}
          </Text>
        )}
        <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
      </Pressable>

      <DatePickerSimple
        value={value}
        onChange={onChange}
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        colorScheme={scheme}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  selectionSection: {
    marginBottom: SPACING.lg,
  },
  yearScroll: {
    height: 180,
  },
  yearItem: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  yearItemSelected: {
    borderWidth: 2,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  monthItem: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  monthItemSelected: {
    borderWidth: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.base,
  },
  clearBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderBottomWidth: 1,
  },
});
