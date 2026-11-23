export const SPORTS = [
  { id: 'running', label: 'Бег', icon: 'directions-run', emoji: '🏃' },
  { id: 'cycling', label: 'Велосипед', icon: 'directions-bike', emoji: '🚴' },
  { id: 'football', label: 'Футбол', icon: 'sports-soccer', emoji: '⚽' },
  { id: 'basketball', label: 'Баскетбол', icon: 'sports-basketball', emoji: '🏀' },
  { id: 'volleyball', label: 'Волейбол', icon: 'sports-volleyball', emoji: '🏐' },
  { id: 'tennis', label: 'Теннис', icon: 'sports-tennis', emoji: '🎾' },
  { id: 'badminton', label: 'Бадминтон', icon: 'sports-tennis', emoji: '🏸' },
  { id: 'swimming', label: 'Плавание', icon: 'pool', emoji: '🏊' },
  { id: 'parkour', label: 'Паркур', icon: 'terrain', emoji: '🏃' },
  { id: 'other', label: 'Другое', icon: 'local-activity', emoji: '🏅' },
] as const;

export type SportType = typeof SPORTS[number]['id'];
export const sportLabel = (value: string) => SPORTS.find(sport => sport.id === value || sport.label === value)?.label ?? value;
