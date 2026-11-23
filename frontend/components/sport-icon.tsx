import { SPORTS } from '@/constants/sports';
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";

type Props = {
  sport: string;
  size?: number;
  color?: string;
};

const getIconName = (sport: string): React.ComponentProps<typeof MaterialIcons>["name"] =>
  SPORTS.find(item => item.id === sport || item.label === sport)?.icon ?? 'local-activity';

export function SportIcon({ sport, size = 20, color = "#000" }: Props) {
  return <MaterialIcons name={getIconName(sport)} size={size} color={color} />;
}
