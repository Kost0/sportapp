import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { sportLabel } from '@/constants/sports';
import { listPlaces, type SavedPlace } from '@/lib/api/places';
import { useAuth } from '@/lib/auth/auth-context';
import { DEMO_COURTS } from '@/lib/courts';

export type PlaceOption = { id: string; name: string; address: string; lat?: number; lon?: number; sports: string[]; demo: boolean };
export const savedPlaceOption = (place: SavedPlace): PlaceOption => ({ id: place.placeId, name: place.address, address: place.address, lat: place.lat, lon: place.lon, sports: place.sports, demo: false });
export const demoPlaceOptions: PlaceOption[] = DEMO_COURTS.map(court => ({ id: court.id, name: court.name, address: court.location, sports: [court.sport], demo: true }));

export function PlaceList({ onSelect, picking = false }: { onSelect: (place: PlaceOption) => void; picking?: boolean }) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true); setError(false);
    const timer = setTimeout(() => {
      void listPlaces(token, query.trim(), controller.signal)
        .then(data => { if (!controller.signal.aborted) setPlaces(data.items.map(savedPlaceOption)); })
        .catch(() => { if (!controller.signal.aborted) { setPlaces([]); setError(true); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, retry > 0 ? 0 : 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [token, query, retry]));
  const examples = demoPlaceOptions.filter(place => `${place.name} ${place.address}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const render = (place: PlaceOption) => <Pressable key={place.id} accessibilityRole="button"
    accessibilityLabel={`${picking ? 'Выбрать место' : 'Открыть площадку'}: ${place.name}`}
    onPress={() => onSelect(place)} style={styles.card}>
    <MaterialIcons name="place" size={26} color={COLORS.ink} />
    <View style={styles.info}>
      <Text style={styles.name}>{place.name}</Text>
      <Text style={styles.secondary}>{place.demo ? place.address : place.sports.map(sportLabel).join(' · ')}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
  </Pressable>;
  return <View style={styles.list}>
    <TextInput value={query} onChangeText={setQuery} placeholder="Поиск мест по адресу" accessibilityLabel="Поиск мест по адресу" style={styles.search} />
    <Text style={styles.heading}>Места из активностей</Text>
    {loading ? <ActivityIndicator color={COLORS.ink} /> : error ? <View style={styles.list}>
      <Text style={styles.secondary}>Не удалось загрузить места.</Text>
      <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={styles.name}>Повторить загрузку мест</Text></Pressable>
    </View> : places.length ? places.map(render) : <Text style={styles.secondary}>Места не найдены. Адрес новой активности появится здесь после её создания.</Text>}
    {examples.length > 0 && <><Text style={styles.heading}>Примеры площадок</Text><Text style={styles.secondary}>Занятость и расстояние для этих площадок не отслеживаются.</Text>{examples.map(render)}</>}
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 12 }, heading: { fontSize: 16, fontWeight: '600', color: COLORS.ink, marginTop: 8 },
  search: { backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, color: COLORS.ink, fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, gap: 12 },
  info: { flex: 1, gap: 6 }, name: { fontSize: 14, fontWeight: '600', color: COLORS.ink }, secondary: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary },
});
