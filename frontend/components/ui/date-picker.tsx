import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';
import { clampDateParts, daysInMonth, formatDateOnly, parseDateOnly, type DateParts } from '@/utils/date-only';

type Props = {
  value: string;
  onChange: (date: string) => void;
  visible: boolean;
  onClose: () => void;
  minYear?: number;
  maxYear?: number;
  colorScheme?: ColorScheme;
};
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const ROW_HEIGHT = 48;

function DateColumn({ label, values, selected, onSelect, visible, scheme }: {
  label: string; values: { value: number; label: string }[]; selected: number;
  onSelect: (value: number) => void; visible: boolean; scheme: ColorScheme;
}) {
  const ref = useRef<ScrollView>(null);
  const colors = getColor(scheme);
  const selectedIndex = values.findIndex(item => item.value === selected);
  const scrollToSelection = () => ref.current?.scrollTo({
    y: Math.max(0, selectedIndex * ROW_HEIGHT - ROW_HEIGHT * 2), animated: false,
  });
  useEffect(() => {
    if (visible) ref.current?.scrollTo({
      y: Math.max(0, selectedIndex * ROW_HEIGHT - ROW_HEIGHT * 2), animated: false,
    });
  }, [visible, selectedIndex]);
  return <View style={styles.column} accessibilityRole="radiogroup" accessibilityLabel={label}>
    <Text style={[TEXT_STYLES.label, styles.columnTitle, { color: colors.textSecondary }]}>{label}</Text>
    <ScrollView ref={ref} style={styles.options} onContentSizeChange={scrollToSelection} nestedScrollEnabled>
      {values.map(item => <Pressable key={item.value}
        accessibilityRole="radio" accessibilityLabel={`${label} ${item.label}`}
        accessibilityState={{ checked: item.value === selected }}
        aria-checked={item.value === selected}
        onPress={() => onSelect(item.value)}
        style={[styles.option, { backgroundColor: item.value === selected ? colors.ink : colors.surface }]}>
        <Text style={[TEXT_STYLES.body, { color: item.value === selected ? colors.textInverse : colors.textPrimary }]}>
          {item.label}
        </Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}

export function DatePickerSimple({ value, onChange, visible, onClose, minYear, maxYear, colorScheme = 'light' }: Props) {
  const colors = getColor(colorScheme);
  const now = new Date();
  const todayYear = now.getFullYear();
  const upperYear = Math.min(maxYear ?? todayYear, todayYear);
  const lowerYear = Math.min(minYear ?? todayYear - 120, upperYear);
  const maxMonth = upperYear === todayYear ? now.getMonth() + 1 : 12;
  const maxDay = upperYear === todayYear ? now.getDate() : 31;
  const [selected, setSelected] = useState<DateParts>({ year: upperYear - 25, month: 1, day: 1 });
  useEffect(() => {
    if (visible) setSelected(clampDateParts(parseDateOnly(value) ?? { year: upperYear - 25, month: 1, day: 1 },
      lowerYear, { year: upperYear, month: maxMonth, day: maxDay }));
  }, [visible, value, lowerYear, upperYear, maxMonth, maxDay]);
  const choose = (patch: Partial<DateParts>) => setSelected(previous => clampDateParts({ ...previous, ...patch },
    lowerYear, { year: upperYear, month: maxMonth, day: maxDay }));
  const monthCount = selected.year === upperYear ? maxMonth : 12;
  const dayCount = selected.year === upperYear && selected.month === maxMonth
    ? maxDay : daysInMonth(selected.year, selected.month);

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть выбор даты" />
      <View style={[styles.content, { backgroundColor: colors.surface }]} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text style={[TEXT_STYLES.h3, { color: colors.textPrimary }]}>Дата рождения</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Отмена" hitSlop={12}>
            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.columns}>
          <DateColumn label="День" selected={selected.day} visible={visible} scheme={colorScheme}
            values={Array.from({ length: dayCount }, (_, index) => ({ value: index + 1, label: String(index + 1) }))}
            onSelect={day => choose({ day })} />
          <DateColumn label="Месяц" selected={selected.month} visible={visible} scheme={colorScheme}
            values={MONTHS.slice(0, monthCount).map((label, index) => ({ value: index + 1, label }))}
            onSelect={month => choose({ month })} />
          <DateColumn label="Год" selected={selected.year} visible={visible} scheme={colorScheme}
            values={Array.from({ length: upperYear - lowerYear + 1 }, (_, index) => ({ value: upperYear - index, label: String(upperYear - index) }))}
            onSelect={year => choose({ year })} />
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={[styles.button, { borderColor: colors.divider }]}
            onPress={() => { onChange(''); onClose(); }}>
            <Text style={[TEXT_STYLES.label, { color: colors.textSecondary }]}>Очистить</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.button, { backgroundColor: colors.ink }]}
            onPress={() => { onChange(formatDateOnly(selected)); onClose(); }}>
            <Text style={[TEXT_STYLES.label, { color: colors.textInverse }]}>Подтвердить</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

export function DatePickerInput({ value, onChange, placeholder = 'Выберите дату', colorScheme = 'light', disabled }: {
  value: string; onChange: (date: string) => void; placeholder?: string; colorScheme?: ColorScheme; disabled?: boolean;
}) {
  const colors = getColor(colorScheme);
  const [visible, setVisible] = useState(false);
  const parsed = parseDateOnly(value);
  const display = parsed ? value.split('-').reverse().join('.') : placeholder;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Дата рождения: ${display}`} disabled={disabled}
      style={[styles.input, { borderBottomColor: colors.border }]} onPress={() => setVisible(true)}>
      <Text style={[TEXT_STYLES.body, { color: parsed ? colors.textPrimary : colors.inputPlaceholder }]}>{display}</Text>
      <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
    </Pressable>
    <DatePickerSimple value={value} onChange={onChange} visible={visible} onClose={() => setVisible(false)} colorScheme={colorScheme} />
  </>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: 32, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  columns: { flexDirection: 'row', gap: SPACING.sm, flexShrink: 1 },
  column: { flex: 1, minWidth: 0 },
  columnTitle: { textAlign: 'center', marginBottom: SPACING.sm },
  options: { height: ROW_HEIGHT * 5, flexShrink: 1 },
  option: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  button: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderBottomWidth: 1 },
});
