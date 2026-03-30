import { MaterialIcons } from "@expo/vector-icons";
import React from "react";

type Props = {
  sport: string;
  size?: number;
  color?: string;
};

const getIconName = (sport: string): React.ComponentProps<typeof MaterialIcons>["name"] => {
  const normalized = sport.toLowerCase();
  if (normalized.includes("баскет")) return "sports-basketball";
  if (normalized.includes("теннис")) return "sports-tennis";
  if (normalized.includes("футбол")) return "sports-soccer";
  if (normalized.includes("бег")) return "directions-run";
  if (normalized.includes("йога")) return "self-improvement";
  return "local-activity";
};

export function SportIcon({ sport, size = 20, color = "#000" }: Props) {
  return <MaterialIcons name={getIconName(sport)} size={size} color={color} />;
}
