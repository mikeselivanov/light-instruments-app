import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { glyphFor } from '../lib/hebrew';
import { fonts } from '../lib/theme';

/**
 * Насколько буква опускается, долей от кегля, чтобы её чернила встали в центр
 * своего бокса.
 *
 * Выведено из метрик Ashurit, а не подобрано. Базовая линия шрифта лежит на
 * 0.960em ниже верха строки при штатном интерлиньяже, а сама строка высотой
 * 1.37em (0.960 + 0.41 зарезервированного выносного элемента) — те же числа, на
 * которых стоит HebrewGlyphs. При lineHeight = fontSize половинный интерлиньяж
 * уходит в минус на 0.185em, базовая линия оказывается на 0.775em от верха
 * бокса, а средняя буква высотой 0.649em занимает от 0.126em до 0.775em: её
 * оптический центр на 0.4505em против центра бокса на 0.5em. Разницу и
 * добираем — вниз, а не вверх.
 */
const OPTICAL_OFFSET = 0.05;

/**
 * Одна ивритская буква. Глиф всегда достаётся через glyphFor: `isFinal`
 * переключает каф, мем, нун, пей и цадик на конечные формы ך ם ן ף ץ.
 */
export function Glyph({
  transliteration,
  size,
  color,
  isFinal = false,
  style,
}: {
  transliteration: string;
  size: number;
  color: string;
  isFinal?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        styles.glyph,
        {
          fontSize: size,
          lineHeight: size,
          color,
          transform: [{ translateY: size * OPTICAL_OFFSET }],
        },
        style,
      ]}
      // Буква — изображение, а не текст для чтения вслух: её транслитерация
      // всегда стоит рядом отдельной подписью.
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {glyphFor(transliteration, isFinal)}
    </Text>
  );
}

const styles = StyleSheet.create({
  glyph: {
    fontFamily: fonts.displayHebrew,
    // Android иначе добавляет свой отступ поверх метрик шрифта и ломает расчёт.
    includeFontPadding: false,
  },
});
