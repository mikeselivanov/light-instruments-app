import rawNames from '../assets/data/names.ru.json';

export type DivineName = {
  id: number;
  title: string;
  hebrewLetters: [string, string, string];
  category: string;
  keywords: string[];
  summary: string;
};

export const NAMES: DivineName[] = rawNames as DivineName[];

export function getNameById(id: number): DivineName | undefined {
  return NAMES.find((n) => n.id === id);
}

export function randomNameId(excludeId?: number): number {
  if (NAMES.length <= 1) return NAMES[0].id;
  let id = excludeId;
  while (id === undefined || id === excludeId) {
    id = NAMES[Math.floor(Math.random() * NAMES.length)].id;
  }
  return id;
}

// Deterministic "name of the day" — same name all day, changes at local midnight.
export function nameOfTheDay(date: Date = new Date()): DivineName {
  const dayKey = Math.floor(date.getTime() / 86_400_000);
  const index = dayKey % NAMES.length;
  return NAMES[index];
}

export type Category = {
  name: string;
  count: number;
};

export function getCategories(): Category[] {
  const counts = new Map<string, number>();
  for (const name of NAMES) {
    counts.set(name.category, (counts.get(name.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getNamesByCategory(category: string): DivineName[] {
  return NAMES.filter((n) => n.category === category);
}
