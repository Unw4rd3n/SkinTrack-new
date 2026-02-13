import React from 'react';
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';

type SelectRowProps = {
  label: string;
  value: number | null;
  options: number[];
  onChange: (value: number) => void;
  suffix?: string;
  pickerMode?: 'sheet' | 'wheel';
};

export function SelectRow({
  label,
  value,
  options,
  onChange,
  suffix,
  pickerMode = 'sheet',
}: SelectRowProps) {
  const [wheelVisible, setWheelVisible] = React.useState(false);
  const [wheelValue, setWheelValue] = React.useState<number | null>(value);

  React.useEffect(() => {
    setWheelValue(value);
  }, [value]);

  const displayValue =
    value === null ? '—' : `${value}${suffix ? ` ${suffix}` : ''}`;

  const open = () => {
    if (pickerMode === 'wheel') {
      setWheelValue(value ?? options[0] ?? null);
      setWheelVisible(true);
      return;
    }

    const labels = options.map(
      option => `${option}${suffix ? ` ${suffix}` : ''}`,
    );
    const cancelButtonIndex = labels.length;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, 'Отмена'],
          cancelButtonIndex,
          title: label,
        },
        index => {
          if (index < options.length) {
            onChange(options[index]);
          }
        },
      );
      return;
    }
    if (labels.length > 7) {
      Alert.alert(label, 'Доступно на iOS через системный список.');
      return;
    }
    const buttons = labels.map((text, index) => ({
      text,
      onPress: () => onChange(options[index]),
    }));
    Alert.alert(label, 'Выбери значение', [
      ...buttons,
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  return (
    <>
      <Pressable style={styles.row} onPress={open}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{displayValue}</Text>
        </View>
        <View style={styles.chevronWrap}>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={wheelVisible}
        onRequestClose={() => setWheelVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable
                style={styles.modalDone}
                onPress={() => setWheelVisible(false)}
              >
                <Text style={styles.modalDoneText}>Готово</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.wheelList}
              contentContainerStyle={styles.wheelListContent}
              showsVerticalScrollIndicator={false}
            >
              {options.map(option => (
                <Pressable
                  key={option}
                  style={[
                    styles.wheelOption,
                    wheelValue === option && styles.wheelOptionActive,
                  ]}
                  onPress={() => {
                    setWheelValue(option);
                    onChange(option);
                  }}
                >
                  <Text
                    style={[
                      styles.wheelOptionText,
                      wheelValue === option && styles.wheelOptionTextActive,
                    ]}
                  >
                    {option}
                    {suffix ? ` ${suffix}` : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  value: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginTop: spacing.xs,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.accent,
    marginTop: -2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  modalDone: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  modalDoneText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
  wheelList: {
    maxHeight: 300,
  },
  wheelListContent: {
    paddingBottom: spacing.sm,
  },
  wheelOption: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  wheelOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  wheelOptionText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  wheelOptionTextActive: {
    color: colors.primaryDeep,
  },
});
