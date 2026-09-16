import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useInstallPrompt } from '../lib/install-prompt';
import { tappable } from '../lib/interaction';
import { colors, fonts, type } from '../lib/theme';

export function InstallBanner() {
  const { canPrompt, isIOS, promptInstall, dismiss } = useInstallPrompt();

  if (!canPrompt) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.text}>
        <Text style={styles.title}>Установить приложение</Text>
        <Text style={styles.body}>
          {isIOS
            ? 'Нажмите «Поделиться», затем «На экран „Домой“»'
            : 'Откроется как обычное приложение и будет работать без интернета'}
        </Text>
      </View>
      {/* No button on iOS: there is no beforeinstallprompt event there, so
          installation cannot be triggered programmatically — only explained. */}
      {!isIOS && (
        <Pressable
          onPress={promptInstall}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, tappable, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>Установить</Text>
        </Pressable>
      )}
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Скрыть"
        hitSlop={12}
        style={({ pressed }) => [styles.close, tappable, pressed && styles.pressed]}
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.veilRaised,
    borderColor: colors.threadBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.rowTitle,
    color: colors.parchment,
  },
  body: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
  },
  action: {
    backgroundColor: colors.sparkWash,
    borderColor: colors.spark,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionText: {
    fontFamily: fonts.bodyBold,
    ...type.button,
    color: colors.spark,
  },
  close: {
    padding: 4,
  },
  closeText: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.parchmentDim,
  },
});
