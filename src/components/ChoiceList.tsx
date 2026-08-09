import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

type Choice = {
  id: string;
  label: string;
  meta?: string | null;
};

type ChoiceListProps = {
  choices: Choice[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

export function ChoiceList({ choices, selectedId, onSelect }: ChoiceListProps) {
  return (
    <View style={styles.wrap}>
      {choices.map((choice) => {
        const selected = choice.id === selectedId;
        return (
          <Pressable
            key={choice.id}
            accessibilityRole="button"
            onPress={() => onSelect(choice.id)}
            style={[styles.choice, selected && styles.selected]}
          >
            <Text style={styles.label}>{choice.label}</Text>
            {choice.meta ? <Text style={styles.meta}>{choice.meta}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  choice: {
    backgroundColor: '#FBFCFB',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 2,
    padding: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  selected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  wrap: {
    gap: spacing.sm,
  },
});
