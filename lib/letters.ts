/**
 * Три класса букв по «Сефер Йецира»: три матери (стихии), семь двойных (пара
 * противоположностей, планета, день недели) и двенадцать простых (способность,
 * созвездие, месяц).
 */
export type LetterCategory = 'mother' | 'double' | 'simple';

export type Letter = {
  /**
   * Ключ для lib/hebrew.ts. Данные держат транслитерацию, а не сам глиф, чтобы
   * буква везде получалась через glyphFor() — только так работают конечные формы.
   *
   * Тип намеренно `string`, а не `keyof typeof HEBREW_GLYPH_BY_TRANSLITERATION`:
   * та таблица объявлена как Record<string, string>, так что keyof от неё — всё
   * тот же string, пользы ноль, а импорт сделал бы этот файл незапускаемым в
   * node без сборщика. Соответствие ключей таблице проверяет тест.
   */
  transliteration: string;
  /** Как буква подписана в интерфейсе. */
  name: string;
  category: LetterCategory;
  /** Над чем «Сефер Йецира» поставила её царствовать. */
  note: string;
};

/**
 * Алфавитный порядок — он же порядок расстановки по кругу в колесе Галгал
 * (алеф сверху, дальше по часовой).
 */
export const ALPHABET: readonly Letter[] = [
  { transliteration: 'АЛЕФ', name: 'Алеф', category: 'mother',
    note: 'Мать. Царствует над дыханием: воздух в мире, умеренное в году, грудь в теле — держит равновесие между огнём и водой.' },
  { transliteration: 'БЕТ', name: 'Бет', category: 'double',
    note: 'Двойная. Царствует над мудростью; её оборот — глупость. Луна, воскресенье.' },
  { transliteration: 'ГИМЕЛ', name: 'Гимел', category: 'double',
    note: 'Двойная. Царствует над богатством; его оборот — бедность. Марс, понедельник.' },
  { transliteration: 'ДАЛЕТ', name: 'Далет', category: 'double',
    note: 'Двойная. Царствует над семенем; его оборот — запустение. Солнце, вторник.' },
  { transliteration: 'ХЕЙ', name: 'Хей', category: 'simple',
    note: 'Простая. Царствует над речью. Овен, нисан.' },
  { transliteration: 'ВАВ', name: 'Вав', category: 'simple',
    note: 'Простая. Царствует над мыслью. Телец, ияр.' },
  { transliteration: 'ЗАЙН', name: 'Зайн', category: 'simple',
    note: 'Простая. Царствует над движением. Близнецы, сиван.' },
  { transliteration: 'ХЕТ', name: 'Хет', category: 'simple',
    note: 'Простая. Царствует над зрением. Рак, таммуз.' },
  { transliteration: 'ТЕТ', name: 'Тет', category: 'simple',
    note: 'Простая. Царствует над слухом. Лев, ав.' },
  { transliteration: 'ЙУД', name: 'Йуд', category: 'simple',
    note: 'Простая. Царствует над действием. Дева, элул.' },
  { transliteration: 'КАФ', name: 'Каф', category: 'double',
    note: 'Двойная. Царствует над жизнью; её оборот — смерть. Венера, среда.' },
  { transliteration: 'ЛАМЕД', name: 'Ламед', category: 'simple',
    note: 'Простая. Царствует над соитием. Весы, тишрей.' },
  { transliteration: 'МЕМ', name: 'Мем', category: 'mother',
    note: 'Мать. Царствует над водой: земля в мире, холод в году, чрево в теле.' },
  { transliteration: 'НУН', name: 'Нун', category: 'simple',
    note: 'Простая. Царствует над обонянием. Скорпион, хешван.' },
  { transliteration: 'САМЕХ', name: 'Самех', category: 'simple',
    note: 'Простая. Царствует над сном. Стрелец, кислев.' },
  { transliteration: 'АЙН', name: 'Айн', category: 'simple',
    note: 'Простая. Царствует над гневом. Козерог, тевет.' },
  { transliteration: 'ПЕЙ', name: 'Пей', category: 'double',
    note: 'Двойная. Царствует над властью; её оборот — подчинение. Меркурий, четверг.' },
  { transliteration: 'ЦАДИК', name: 'Цадик', category: 'simple',
    note: 'Простая. Царствует над вкусом. Водолей, шват.' },
  { transliteration: 'КУФ', name: 'Куф', category: 'simple',
    note: 'Простая. Царствует над смехом. Рыбы, адар.' },
  { transliteration: 'РЕШ', name: 'Реш', category: 'double',
    note: 'Двойная. Царствует над миром; его оборот — война. Сатурн, пятница.' },
  { transliteration: 'ШИН', name: 'Шин', category: 'mother',
    note: 'Мать. Царствует над огнём: небо в мире, жар в году, голова в теле.' },
  { transliteration: 'ТАВ', name: 'Тав', category: 'double',
    note: 'Двойная. Царствует над красотой; её оборот — безобразие. Юпитер, суббота.' },
];

/** Подпись под сеткой букв — источник соответствий выше. */
export const ALPHABET_SOURCE =
  'Соответствия букв даны по «Сефер Йецира» в версии Виленского Гаона, перевод Арье Каплана.';
