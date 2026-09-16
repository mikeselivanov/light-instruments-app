import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenTransition } from '../components/ScreenTransition';
import { HomeButton } from '../components/HomeButton';
import { selectableText } from '../lib/interaction';
import { useScreenPadding } from '../lib/safe-area';
import { colors, fonts, type } from '../lib/theme';

const PARAGRAPHS = [
  '72 Имени зашифрованы в трёх стихах книги Исход (14:19–21) о рассечении вод Красного моря — каждый стих состоит ровно из 72 букв. Особый способ чтения этих трёх строк столбцами даёт 72 трёхбуквенных сочетания.',
  'Каждое сочетание — не слово и не имя в обычном смысле, а код: три буквы несут три силы, как плюс, минус и заземление. Смысл раскрывается не через перевод, а через медленное всматривание в начертание и понимание, для чего сила предназначена.',
  'В основе — идея сокрытия: Бесконечный Свет Творца скрыт за завесами, и материальный мир — следствие этого сокрытия. Эго — то, что удерживает завесу; проактивная духовная работа снимает её и раскрывает Свет, не дожидаясь, пока это сделает страдание.',
  'Чтобы Имя подействовало, книга называет три условия: уверенность в его силе, понимание смысла и физическое действие — сосредоточенное всматривание в буквы во время медитации.',
];

const ATTRIBUTION =
  'Приложение основано на книге «72 Имени Бога» Иегуды Берга (Yehuda Berg, Kabbalah Centre International). Все тексты в приложении — авторский пересказ своими словами, а не официальное издание книги.';

export default function Intro() {
  const padding = useScreenPadding();

  return (
    <ScreenTransition style={{ backgroundColor: colors.void }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.void }}
        contentContainerStyle={[styles.scroll, padding]}
      >
        <HomeButton style={styles.back} />

        <Text style={styles.title}>Введение</Text>
        <Text style={styles.sub}>О чём эта книга и как читать имена</Text>

        <View style={styles.body}>
          {PARAGRAPHS.map((p, i) => (
            <Text key={i} style={[styles.paragraph, selectableText]}>
              {p}
            </Text>
          ))}
        </View>

        <Text style={[styles.attribution, selectableText]}>{ATTRIBUTION}</Text>
      </ScrollView>
    </ScreenTransition>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    marginBottom: 22,
  },
  title: {
    fontFamily: fonts.displayRuBold,
    ...type.screenTitle,
    color: colors.parchment,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.body,
    ...type.body,
    color: colors.parchmentDim,
    marginBottom: 26,
  },
  body: {
    gap: 20,
  },
  paragraph: {
    fontFamily: fonts.body,
    ...type.read,
    color: colors.parchment,
  },
  attribution: {
    fontFamily: fonts.body,
    ...type.small,
    color: colors.parchmentDim,
    marginTop: 30,
  },
});
