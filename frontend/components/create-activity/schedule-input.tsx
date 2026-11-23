import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton, SecondaryButton } from '@/components/ui-buttons';
import { COLORS } from '@/constants/colors';
import { daysInMonth, todayDateOnly } from '@/utils/date-only';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const pad = (number: number) => String(number).padStart(2, '0');
export const scheduleDate = (date: Date | null, time: string) => {
  if (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  const result = new Date(date); result.setHours(hour, minute, 0, 0);
  return Number.isFinite(result.getTime()) ? result : null;
};

type Props = { date: Date | null; time: string; onChange: (date: Date | null, time: string) => void; disabled?: boolean; quickDays?: boolean };

export function ScheduleInput({ date, time, onChange, disabled = false, quickDays = true }: Props) {
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [pickerReady, setPickerReady] = useState(false);
  const [month, setMonth] = useState(0);
  const [yearText, setYearText] = useState('');
  const [hour, setHour] = useState('18');
  const [minute, setMinute] = useState('00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const selectedKey = date ? todayDateOnly(date) : '';
  const openCalendar = () => {
    const initial = date ?? today;
    setPickerReady(false);
    setMonth(initial.getMonth()); setYearText(String(initial.getFullYear())); setPicker('date');
  };
  const openTime = () => {
    setPickerReady(false);
    const [h = '18', m = '00'] = time.split(':'); setHour(h); setMinute(m); setPicker('time');
  };
  const year = Number(yearText);
  const yearValid = /^\d{4}$/.test(yearText) && year >= today.getFullYear() && year <= 9999;
  const count = yearValid ? daysInMonth(year, month + 1) : 0;
  const offset = yearValid ? (new Date(year, month, 1).getDay() + 6) % 7 : 0;
  const changeMonth = (delta: number) => {
    const next = new Date(yearValid ? year : today.getFullYear(), month + delta, 1);
    setMonth(next.getMonth()); setYearText(String(next.getFullYear()));
  };
  const timeValid = /^\d{1,2}$/.test(hour) && /^\d{1,2}$/.test(minute) && Number(hour) < 24 && Number(minute) < 60;
  return <View style={styles.sections}>
    <Text style={styles.label}>Выберите день</Text>
    {quickDays && <View style={styles.week}>
      {Array.from({ length: 7 }, (_, index) => {
        const day = new Date(today); day.setDate(day.getDate() + index);
        const key = todayDateOnly(day); const selected = key === selectedKey;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Дата ${key}`}
          disabled={disabled} onPress={() => onChange(day, time)} style={[styles.quickDay, selected && styles.selected]}>
          <Text style={[styles.dayNumber, selected && styles.selectedText]}>{day.getDate()}</Text>
          <Text style={[styles.small, selected && styles.selectedText]}>{index === 0 ? 'Сегодня' : ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][day.getDay()]}</Text>
        </Pressable>;
      })}
    </View>}
    <Pressable accessibilityRole="button" accessibilityLabel="Выбрать другую дату" disabled={disabled} onPress={openCalendar} style={styles.selector}>
      <MaterialIcons name="calendar-today" size={22} color={COLORS.ink} />
      <Text style={styles.value}>{date ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}` : 'Другая дата'}</Text>
      <MaterialIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
    </Pressable>
    <Text style={styles.label}>Выберите время</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Выбрать время: ${time}`} disabled={disabled} onPress={openTime} style={styles.selector}>
      <MaterialIcons name="access-time" size={24} color={COLORS.ink} />
      <Text style={styles.value}>{time}</Text>
      <MaterialIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
    </Pressable>
    <Modal visible={picker !== null} transparent animationType="slide" onShow={() => setPickerReady(true)} onRequestClose={() => setPicker(null)}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть выбор даты и времени" style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title}>{picker === 'date' ? 'Выберите дату' : 'Время начала'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Отмена выбора" onPress={() => setPicker(null)} style={styles.close}>
              <MaterialIcons name="close" size={24} color={COLORS.ink} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
            {picker === 'date' ? <>
              <View style={styles.calendarHeader}>
                <Pressable accessibilityRole="button" accessibilityLabel="Предыдущий месяц" style={styles.close}
                  disabled={!yearValid || (year === today.getFullYear() && month <= today.getMonth())} onPress={() => changeMonth(-1)}>
                  <MaterialIcons name="chevron-left" size={28} color={COLORS.ink} />
                </Pressable>
                <Text style={styles.label}>{MONTHS[month]}</Text>
                <TextInput accessibilityLabel="Год активности" editable={pickerReady} value={yearText} onChangeText={setYearText} keyboardType="number-pad" maxLength={4} style={styles.year} />
                <Pressable accessibilityRole="button" accessibilityLabel="Следующий месяц" style={styles.close}
                  disabled={!yearValid || (year === 9999 && month === 11)} onPress={() => changeMonth(1)}>
                  <MaterialIcons name="chevron-right" size={28} color={COLORS.ink} />
                </Pressable>
              </View>
              {!yearValid && <Text style={styles.error}>Укажите год от {today.getFullYear()} до 9999.</Text>}
              <View style={styles.calendar}>
                {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}
                {Array.from({ length: offset }, (_, index) => <View key={`blank-${index}`} style={styles.cell} />)}
                {Array.from({ length: count }, (_, index) => {
                  const day = new Date(year, month, index + 1); const key = todayDateOnly(day);
                  const past = day < today; const selected = key === selectedKey;
                  return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`Выбрать дату ${key}`} disabled={past}
                    onPress={() => { onChange(day, time); setPicker(null); }} style={[styles.cell, selected && styles.selected, past && styles.disabled]}>
                    <Text style={[styles.dayNumber, selected && styles.selectedText]}>{index + 1}</Text>
                  </Pressable>;
                })}
              </View>
            </> : <>
              <View style={styles.timeRow}>
                <View style={styles.timeField}><Text style={styles.small}>Часы (00–23)</Text><TextInput accessibilityLabel="Часы" value={hour}
                  editable={pickerReady} onChangeText={setHour} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={styles.timeInput} /></View>
                <Text style={styles.title}>:</Text>
                <View style={styles.timeField}><Text style={styles.small}>Минуты (00–59)</Text><TextInput accessibilityLabel="Минуты" value={minute}
                  editable={pickerReady} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={styles.timeInput} /></View>
              </View>
              {!timeValid && <Text style={styles.error}>Укажите время от 00:00 до 23:59.</Text>}
              <PrimaryButton title="Готово" disabled={!timeValid} onPress={() => { onChange(date, `${pad(Number(hour))}:${pad(Number(minute))}`); setPicker(null); }} />
            </>}
            <SecondaryButton title="Отмена" onPress={() => setPicker(null)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  sections: { gap: 12 }, label: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  week: { flexDirection: 'row', gap: 4 }, quickDay: { flex: 1, minHeight: 64, backgroundColor: COLORS.surface, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dayNumber: { fontSize: 16, fontWeight: '600', color: COLORS.ink }, small: { fontSize: 10, color: COLORS.textSecondary },
  selected: { backgroundColor: COLORS.ink }, selectedText: { color: COLORS.surface }, disabled: { opacity: 0.25 },
  selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 14, gap: 12 }, value: { flex: 1, fontSize: 16, color: COLORS.ink },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 20, fontWeight: '600', color: COLORS.ink }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: 20, gap: 16 }, calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  year: { width: 68, padding: 8, borderRadius: 8, backgroundColor: COLORS.surface, fontSize: 16, color: COLORS.ink, textAlign: 'center' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.2857%', textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 8 },
  cell: { width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, timeField: { flex: 1, gap: 8 },
  timeInput: { textAlign: 'center', fontSize: 32, padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, color: COLORS.ink },
  error: { fontSize: 13, color: COLORS.danger },
});
