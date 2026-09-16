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

/**
 * How far a glyph's ink reaches below the baseline, as a fraction of the font
 * size. Measured straight off Ashurit.ttf (per-glyph `yMin` in the `glyf`
 * table), so these numbers describe that face only — re-measure them if the
 * display font is ever replaced.
 *
 * Only the five word-final forms and Kuf descend enough to matter: 45 of the
 * 72 names contain no descender at all and another 22 only a token one.
 * Letters absent from this table sit on the baseline to within 0.02em.
 * HebrewGlyphs uses this to set a name's transliterations a constant distance
 * below the lowest ink the name actually has, rather than below the fixed
 * descender space the font reserves on every line whether it is used or not.
 */
const DESCENT_BY_GLYPH: Record<string, number> = {
  ץ: 0.425,
  ך: 0.359,
  ן: 0.327,
  ף: 0.327,
  ק: 0.326,
  ע: 0.096,
  פ: 0.07,
  א: 0.043,
  ג: 0.031,
};

export function descentOf(glyph: string): number {
  return DESCENT_BY_GLYPH[glyph] ?? 0;
}
