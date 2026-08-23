// Maps the Russian transliteration used in the source book (e.g. "ВАВ") to the
// actual Hebrew glyph, so a name's `hebrewLetters` array can drive both the
// glyph display and the transliteration caption from a single source of truth.
export const HEBREW_GLYPH_BY_TRANSLITERATION: Record<string, string> = {
  АЛЕФ: 'א',
  БЕТ: 'ב',
  ГИМЕЛ: 'ג',
  ДАЛЕТ: 'ד',
  ХЕЙ: 'ה',
  ВАВ: 'ו',
  ЗАЙН: 'ז',
  ХЕТ: 'ח',
  ТЕТ: 'ט',
  ЙУД: 'י',
  КАФ: 'כ',
  ЛАМЕД: 'ל',
  МЕМ: 'מ',
  НУН: 'נ',
  САМЕХ: 'ס',
  АЙН: 'ע',
  ПЕЙ: 'פ',
  ЦАДИК: 'צ',
  КУФ: 'ק',
  РЕШ: 'ר',
  ШИН: 'ש',
  ТАВ: 'ת',
};

// Five letters take a different glyph when they fall at the end of a word
// (סופית / sofit forms) — Kaf, Mem, Nun, Pe, Tsadi.
const HEBREW_FINAL_GLYPH_BY_TRANSLITERATION: Record<string, string> = {
  КАФ: 'ך',
  МЕМ: 'ם',
  НУН: 'ן',
  ПЕЙ: 'ף',
  ЦАДИК: 'ץ',
};

export function glyphFor(transliteration: string, isFinal = false): string {
  if (isFinal && transliteration in HEBREW_FINAL_GLYPH_BY_TRANSLITERATION) {
    return HEBREW_FINAL_GLYPH_BY_TRANSLITERATION[transliteration];
  }
  return HEBREW_GLYPH_BY_TRANSLITERATION[transliteration] ?? '?';
}
