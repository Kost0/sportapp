/**
 * FilterBar — inline horizontal filter chips.
 * Supports single and multi-select modes, with optional scroll.
 */

import React from 'react';
import {
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

export type FilterOption = {
  /** Unique key for the option */
  key: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Optional badge count */
  count?: number;
};

type FilterBarProps = {
  /** Available filter options */
  options: FilterOption[];
  /** Currently selected key(s) */
  value: string | string[];
  /** Callback when selection changes */
  onChange: (key: string | string[]) => void;
  /** Allow multiple selections */
  multiple?: boolean;
  /** Placeholder when nothing selected */
  placeholder?: string;
  /** Show "All" option at the beginning */
  showAllOption?: boolean;
  /** Label for "All" option */
  allLabel?: string;
  /** Color scheme */
  colorScheme?: ColorScheme;
  /** Optional style overrides */
  style?: object;
};

export function FilterBar({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Все',
  showAllOption = true,
  allLabel = 'Все',
  colorScheme,
  style,
}: FilterBarProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const isAllSelected = selectedValues.length === 0;

  const handlePress = (key: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(key)
        ? selectedValues.filter((v) => v !== key)
        : [...selectedValues, key];
      onChange(newValues);
    } else {
      onChange(key === value ? '' : key);
    }
  };

  const handleAllPress = () => {
    onChange(multiple ? [] : '');
  };

  const renderChip = (option: FilterOption, isSelected: boolean) => (
    <Pressable
      key={option.key}
      onPress={() => handlePress(option.key)}
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
        { borderColor: isSelected ? colors.ink : colors.divider },
      ]}
    >
      {option.icon && (
        <MaterialIcons
          name={option.icon}
          size={16}
          color={isSelected ? colors.textInverse : colors.textSecondary}
          style={styles.chipIcon}
        />
      )}
      <Text
        style={[
          TEXT_STYLES.label,
          styles.chipLabel,
          { color: isSelected ? colors.textInverse : colors.textPrimary },
        ]}
      >
        {option.label}
      </Text>
      {option.count !== undefined && (
        <View
          style={[
            styles.badge,
            { backgroundColor: isSelected ? colors.textInverse : colors.divider },
          ]}
        >
          <Text
            style={[
              TEXT_STYLES.labelSm,
              { color: isSelected ? colors.ink : colors.textSecondary },
            ]}
          >
            {option.count}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {showAllOption && (
          <Pressable
            onPress={handleAllPress}
            style={[
              styles.chip,
              isAllSelected && styles.chipSelected,
              { borderColor: isAllSelected ? colors.ink : colors.divider },
            ]}
          >
            <Text
              style={[
                TEXT_STYLES.label,
                styles.chipLabel,
                { color: isAllSelected ? colors.textInverse : colors.textPrimary },
              ]}
            >
              {allLabel}
            </Text>
          </Pressable>
        )}
        {options.map((option) =>
          renderChip(option, selectedValues.includes(option.key))
        )}
      </ScrollView>
    </View>
  );
}

/**
 * FilterBarModal — filter bar that opens a modal for more options.
 */

import { useState } from 'react';
import { Modal, Pressable as RNPressable } from 'react-native';

type FilterBarModalProps = {
  options: FilterOption[];
  value: string | string[];
  onChange: (key: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  title?: string;
  colorScheme?: ColorScheme;
};

export function FilterBarModal({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Фильтры',
  title = 'Фильтры',
  colorScheme,
}: FilterBarModalProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const [visible, setVisible] = useState(false);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedLabels = options
    .filter((o) => selectedValues.includes(o.key))
    .map((o) => o.label);

  const displayValue =
    selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder;

  const handlePress = (key: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(key)
        ? selectedValues.filter((v) => v !== key)
        : [...selectedValues, key];
      onChange(newValues);
    } else {
      onChange(key === value ? '' : key);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Pressable
        style={[styles.modalTrigger, { borderColor: colors.divider }]}
        onPress={() => setVisible(true)}
      >
        <MaterialIcons
          name="tune"
          size={18}
          color={colors.textSecondary}
        />
        <Text
          style={[
            TEXT_STYLES.label,
            { color: selectedValues.length > 0 ? colors.ink : colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {displayValue}
        </Text>
        {selectedValues.length > 0 && (
          <View style={[styles.clearBadge, { backgroundColor: colors.ink }]}>
            <Text style={[TEXT_STYLES.labelSm, { color: colors.textInverse }]}>
              {selectedValues.length}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <RNPressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setVisible(false)}
        >
          <RNPressable
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[TEXT_STYLES.h3, { color: colors.textPrimary }]}>
                {title}
              </Text>
              <Pressable onPress={() => setVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Options */}
            <View style={styles.modalOptions}>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.key);
                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.modalOption,
                      { borderColor: isSelected ? colors.ink : colors.divider },
                      isSelected && { backgroundColor: colors.inkLight },
                    ]}
                    onPress={() => handlePress(option.key)}
                  >
                    {option.icon && (
                      <MaterialIcons
                        name={option.icon}
                        size={20}
                        color={isSelected ? colors.ink : colors.textSecondary}
                        style={styles.modalOptionIcon}
                      />
                    )}
                    <Text
                      style={[
                        TEXT_STYLES.body,
                        { color: isSelected ? colors.ink : colors.textPrimary },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.count !== undefined && (
                      <Text
                        style={[TEXT_STYLES.bodySm, { color: colors.textSecondary }]}
                      >
                        ({option.count})
                      </Text>
                    )}
                    {isSelected && (
                      <MaterialIcons
                        name="check"
                        size={20}
                        color={colors.ink}
                        style={styles.modalOptionCheck}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalClearBtn, { borderColor: colors.divider }]}
                onPress={() => {
                  onChange(multiple ? [] : '');
                  setVisible(false);
                }}
              >
                <Text style={[TEXT_STYLES.label, { color: colors.textSecondary }]}>
                  Очистить
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalApplyBtn, { backgroundColor: colors.ink }]}
                onPress={() => setVisible(false)}
              >
                <Text style={[TEXT_STYLES.label, { color: colors.textInverse }]}>
                  Применить
                </Text>
              </Pressable>
            </View>
          </RNPressable>
        </RNPressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
  },
  chipSelected: {
    backgroundColor: COLORS.ink,
  },
  chipIcon: {
    marginRight: SPACING.xs,
  },
  chipLabel: {
    color: COLORS.textPrimary,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
    paddingHorizontal: 6,
  },
  // Modal styles
  modalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  clearBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  modalOptions: {
    gap: SPACING.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modalOptionIcon: {
    marginRight: SPACING.base,
  },
  modalOptionCheck: {
    marginLeft: 'auto',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  modalClearBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  modalApplyBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
});
