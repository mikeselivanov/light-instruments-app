import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useInstallPrompt } from '../lib/install-prompt';
import { colors, fonts } from '../lib/theme';

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
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>Установить</Text>
        </Pressable>
      )}
      <Pressable onPress={dismiss} style={styles.close} hitSlop={12}>
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
    fontSize: 15,
    color: colors.parchment,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.parchmentDim,
    lineHeight: 18,
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
    fontSize: 13,
    color: colors.spark,
  },
  close: {
    padding: 4,
  },
  closeText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.parchmentDim,
  },
});
