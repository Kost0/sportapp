import React from "react";

import { type ColorScheme } from "@/constants/colors";
import { AvatarStack as AvatarStackUI, type AvatarStackItem } from "./ui/avatar";

type Props = {
  participants: {
    id: string;
    avatarUrl?: string | null;
    initials?: string;
  }[];
  size?: number;
  max?: number;
  colorScheme?: ColorScheme;
};

export function AvatarStack({ participants, size = 36, max = 3, colorScheme }: Props) {
  const scheme = colorScheme ?? 'light';

  const items: AvatarStackItem[] = participants.map(p => ({
    id: p.id,
    avatarUrl: p.avatarUrl,
    initials: p.initials,
  }));

  return <AvatarStackUI items={items} size={size} max={max} colorScheme={scheme} />;
}
