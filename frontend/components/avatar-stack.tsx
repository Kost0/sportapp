import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../constants/colors";
import type { ActivityParticipant } from "../data/activities";

type Props = {
  participants: ActivityParticipant[];
  size?: number;
  max?: number;
};

export function AvatarStack({ participants, size = 54, max = 3 }: Props) {
  const items = participants.slice(0, max);
  const extra = Math.max(participants.length - items.length, 0);

  return (
    <View style={styles.row}>
      {items.map((p, idx) => (
        <View
          key={p.id}
          style={[
            styles.avatarWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: idx === 0 ? 0 : -Math.round(size * 0.24),
            },
          ]}
        >
          <Image
            source={{ uri: p.avatarUrl }}
            style={{ width: "100%", height: "100%", borderRadius: size / 2 }}
          />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={[
            styles.extra,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: items.length === 0 ? 0 : -Math.round(size * 0.24),
            },
          ]}
        >
          <Text style={styles.extraText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    borderWidth: 1.4,
    borderColor: COLORS.surface,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  extra: {
    borderWidth: 1.4,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  extraText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.ink,
  },
});
