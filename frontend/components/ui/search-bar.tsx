/**
 * SearchBar — unified search input component.
 * Supports icon, clear button, placeholder, and custom onSubmit.
 */

import React, { useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, getColor, type ColorScheme } from '@/constants/colors';
import { TEXT_STYLES } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

type SearchBarProps = {
  /** Current search value */
  value: string;
  /** Callback when value changes */
  onChangeText?: (text: string) => void;
  /** Callback when search is submitted */
  onSubmit?: () => void;
  /** Callback when clear button is pressed */
  onClear?: () => void;
  /** Callback when focus changes */
  onFocus?: () => void;
  onBlur?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether to show search icon */
  showIcon?: boolean;
  /** Whether to show clear button when has value */
  showClear?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Return key type */
  returnKeyType?: 'search' | 'done' | 'go' | 'next';
  /** Color scheme */
  colorScheme?: ColorScheme;
  /** Optional style overrides */
  style?: object;
};

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  onFocus,
  onBlur,
  placeholder = 'Поиск...',
  disabled = false,
  showIcon = true,
  showClear = true,
  autoFocus = false,
  returnKeyType = 'search',
  colorScheme,
  style,
}: SearchBarProps) {
  const scheme = colorScheme ?? 'light';
  const colors = getColor(scheme);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.inkLight },
        isFocused && styles.containerFocused,
        { borderColor: isFocused ? colors.ink : 'transparent' },
        disabled && styles.containerDisabled,
        style,
      ]}
    >
      {showIcon && (
        <MaterialIcons
          name="search"
          size={20}
          color={isFocused ? colors.ink : colors.textSecondary}
          style={styles.icon}
        />
      )}
      <TextInput
        style={[
          styles.input,
          { color: colors.textPrimary },
          disabled && { color: colors.textSecondary },
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        editable={!disabled}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        blurOnSubmit={false}
      />
      {showClear && value.length > 0 && !disabled && (
        <Pressable onPress={handleClear} hitSlop={8}>
          <MaterialIcons
            name="close"
            size={18}
            color={colors.textSecondary}
            style={styles.clearIcon}
          />
        </Pressable>
      )}
    </View>
  );
}

/**
 * SearchBarWithFilters — search bar with quick filter chips below.
 */

type FilterOption = {
  key: string;
  label: string;
};

type SearchBarWithFiltersProps = SearchBarProps & {
  /** Quick filter options */
  filters?: FilterOption[];
  /** Currently selected filter */
  selectedFilter?: string;
  /** Callback when filter changes */
  onFilterChange?: (filter: string) => void;
};

export function SearchBarWithFilters({
  filters,
  selectedFilter,
  onFilterChange,
  ...searchProps
}: SearchBarWithFiltersProps) {
  const colors = getColor();

  return (
    <View style={styles.filtersContainer}>
      <SearchBar {...searchProps} />
      {filters && filters.length > 0 && (
        <View style={styles.filtersRow}>
          {filters.map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => onFilterChange?.(filter.key)}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.filterChipSelected,
                {
                  borderColor:
                    selectedFilter === filter.key
                      ? colors.ink
                      : colors.divider,
                },
              ]}
            >
              <MaterialIcons
                name="check"
                size={14}
                color={
                  selectedFilter === filter.key
                    ? colors.textInverse
                    : colors.textSecondary
                }
                style={styles.filterChipIcon}
              />
              <Animated.Text
                style={[
                  TEXT_STYLES.labelSm,
                  {
                    color:
                      selectedFilter === filter.key
                        ? colors.textInverse
                        : colors.textPrimary,
                  },
                ]}
              >
                {filter.label}
              </Animated.Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * SearchBarLarge — expanded search for main screens.
 * Features larger icon and more prominent styling.
 */

type SearchBarLargeProps = SearchBarProps & {
  /** Title shown above the search bar */
  title?: string;
  /** Subtitle shown below the search bar */
  subtitle?: string;
};

export function SearchBarLarge({
  title,
  subtitle,
  ...searchProps
}: SearchBarLargeProps) {
  const colors = getColor();

  return (
    <View style={styles.largeContainer}>
      {title && (
        <Animated.Text
          style={[
            TEXT_STYLES.h2,
            styles.largeTitle,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </Animated.Text>
      )}
      <SearchBar {...searchProps} />
      {subtitle && (
        <Animated.Text
          style={[
            TEXT_STYLES.bodySm,
            styles.largeSubtitle,
            { color: colors.textSecondary },
          ]}
        >
          {subtitle}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.base,
  },
  containerFocused: {
    borderWidth: 2,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TEXT_STYLES.body,
    padding: 0,
    margin: 0,
  },
  clearIcon: {
    marginLeft: SPACING.sm,
  },
  // With filters
  filtersContainer: {
    gap: SPACING.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  filterChipSelected: {
    backgroundColor: COLORS.ink,
  },
  filterChipIcon: {
    marginRight: 2,
  },
  // Large
  largeContainer: {
    gap: SPACING.base,
  },
  largeTitle: {
    paddingHorizontal: SPACING.xl,
  },
  largeSubtitle: {
    paddingHorizontal: SPACING.xl,
  },
});
