import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../lib/theme';

const PARAGRAPHS = [
  '72 Имени зашифрованы в трёх стихах книги Исход (14:19–21) о рассечении вод Красного моря — каждый стих состоит ровно из 72 букв. Особый способ чтения этих трёх строк столбцами даёт 72 трёхбуквенных сочетания.',
  'Каждое сочетание — не слово и не имя в обычном смысле, а код: три буквы несут три силы, как плюс, минус и заземление. Смысл раскрывается не через перевод, а через медленное всматривание в начертание и понимание, для чего сила предназначена.',
  'В основе — идея сокрытия: Бесконечный Свет Творца скрыт за завесами, и материальный мир — следствие этого сокрытия. Эго — то, что удерживает завесу; проактивная духовная работа снимает её и раскрывает Свет, не дожидаясь, пока это сделает страдание.',
  'Чтобы Имя подействовало, книга называет три условия: уверенность в его силе, понимание смысла и физическое действие — сосредоточенное всматривание в буквы во время медитации.',
];

export default function Intro() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Назад</Text>
      </Pressable>

      <Text style={styles.title}>Введение</Text>
      <Text style={styles.sub}>О чём эта книга и как читать имена</Text>

      <View style={styles.body}>
        {PARAGRAPHS.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentDim,
    marginBottom: 22,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    fontSize: 24,
    color: colors.parchment,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.parchmentDim,
    marginBottom: 24,
  },
  body: {
    gap: 18,
  },
  paragraph: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 24,
    color: colors.parchment,
  },
});
