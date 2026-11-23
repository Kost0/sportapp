import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';

type Props = { value: number; onChange: (value: number) => void; onValidityChange?: (valid: boolean) => void; disabled?: boolean };

export function CapacityInput({ value, onChange, onValidityChange, disabled = false }: Props) {
  const [draft, setDraft] = useState(String(value || 10));
  const unlimited = value === 0;
  useEffect(() => { if (value > 0) setDraft(String(value)); }, [value]);
  const number = Number(draft);
  const valid = unlimited || (/^\d+$/.test(draft) && number >= 2 && number <= 1000);
  useEffect(() => { onValidityChange?.(valid); }, [valid, onValidityChange]);
  const choose = (next: number) => { setDraft(String(next)); onChange(next); };
  const changeText = (text: string) => {
    setDraft(text);
    if (/^\d+$/.test(text) && Number(text) >= 2 && Number(text) <= 1000) onChange(Number(text));
  };
  return <View style={styles.container}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Без ограничений"
      accessibilityState={{ checked: unlimited, disabled }} aria-checked={unlimited}
      disabled={disabled} onPress={() => onChange(unlimited ? (validFinite(draft) ? number : 10) : 0)}
      style={[styles.unlimited, unlimited && styles.selected]}>
      <Text style={[styles.label, unlimited && styles.selectedText]}>{unlimited ? '✓ ' : ''}Без ограничений</Text>
    </Pressable>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Уменьшить число участников"
        disabled={disabled || unlimited || number <= 2} onPress={() => choose(Math.max(2, (number || 2) - 1))} style={styles.step}>
        <Text style={styles.symbol}>−</Text>
      </Pressable>
      <View style={styles.value}>
        {unlimited ? <Text style={styles.symbol}>∞</Text> : <TextInput accessibilityLabel="Максимум участников"
          value={draft} onChangeText={changeText} keyboardType="number-pad" maxLength={4}
          editable={!disabled} style={styles.input} />}
        <Text style={styles.hint}>включая организатора</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Увеличить число участников"
        disabled={disabled || unlimited || number >= 1000} onPress={() => choose(Math.min(1000, (number || 2) + 1))} style={styles.step}>
        <Text style={styles.symbol}>+</Text>
      </Pressable>
    </View>
    {!unlimited && <View style={styles.presets}>
      {[2, 4, 6, 8, 10, 12, 20, 50].map(preset => <Pressable key={preset} accessibilityRole="button"
        accessibilityLabel={`${preset} участников`} disabled={disabled} onPress={() => choose(preset)}
        style={[styles.preset, value === preset && styles.selected]}>
        <Text style={[styles.label, value === preset && styles.selectedText]}>{preset}</Text>
      </Pressable>)}
    </View>}
    {!valid && <Text accessibilityRole="alert" style={styles.error}>Введите целое число от 2 до 1000 или выберите «Без ограничений».</Text>}
  </View>;
}

const validFinite = (value: string) => /^\d+$/.test(value) && Number(value) >= 2 && Number(value) <= 1000;
const styles = StyleSheet.create({
  container: { gap: 16 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  value: { alignItems: 'center', flex: 1 }, step: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 32, color: COLORS.ink }, input: { fontSize: 32, color: COLORS.ink, textAlign: 'center', width: '100%', padding: 8, backgroundColor: COLORS.surface, borderRadius: 12 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.ink }, hint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6 },
  unlimited: { padding: 14, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', borderWidth: 1, borderColor: COLORS.divider },
  selected: { backgroundColor: COLORS.ink }, selectedText: { color: COLORS.surface },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  preset: { minWidth: 48, padding: 12, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center' },
  error: { fontSize: 13, color: COLORS.danger },
});
