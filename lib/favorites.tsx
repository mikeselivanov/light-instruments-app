import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BirthMethod } from './birth-name';

const STORAGE_KEY = 'favorites:v1';

/**
 * The name the user took as theirs from the birth screen, and which way it was
 * worked out. Only this is kept — never the birth date or time it came from;
 * those are personal and live in the birth screen's state until it closes.
 */
const MY_NAME_KEY = 'myName:v1';

export type MyName = { id: number; method: BirthMethod };

type FavoritesContextValue = {
  favoriteIds: Set<number>;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number) => void;
  /** At most one. Always also a favorite — see `toggleFavorite`. */
  myName: MyName | null;
  /** Favorites the name and makes it "mine", replacing any earlier one. */
  setMyName: (name: MyName) => void;
  isLoaded: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [myName, setMyNameState] = useState<MyName | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(MY_NAME_KEY)])
      .then(([rawFavorites, rawMyName]) => {
        const favorites = new Set<number>(rawFavorites ? JSON.parse(rawFavorites) : []);
        if (rawFavorites) setFavoriteIds(favorites);
        if (rawMyName) {
          const stored: MyName = JSON.parse(rawMyName);
          // "Mine" must always be a favorite. The two keys are written
          // separately, so a write interrupted between them can leave a my-name
          // whose star is gone — drop it rather than show an orphan.
          if (favorites.has(stored.id)) setMyNameState(stored);
          else AsyncStorage.removeItem(MY_NAME_KEY).catch(() => {});
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const writeFavorites = (next: Set<number>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  };

  const toggleFavorite = (id: number) => {
    const removing = favoriteIds.has(id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavorites(next);
      return next;
    });
    // "Mine" is a mark on a favorite, not a list of its own: unstarring the
    // name takes the mark with it, so there is never a "my name" that the
    // Favorites screen does not show.
    if (removing && myName?.id === id) {
      setMyNameState(null);
      AsyncStorage.removeItem(MY_NAME_KEY).catch(() => {});
    }
  };

  const setMyName = (name: MyName) => {
    setFavoriteIds((prev) => {
      if (prev.has(name.id)) return prev;
      const next = new Set(prev).add(name.id);
      writeFavorites(next);
      return next;
    });
    setMyNameState(name);
    AsyncStorage.setItem(MY_NAME_KEY, JSON.stringify(name)).catch(() => {});
  };

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      isFavorite: (id) => favoriteIds.has(id),
      toggleFavorite,
      myName,
      setMyName,
      isLoaded,
    }),
    [favoriteIds, myName, isLoaded]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}

/** «по дате» / «по времени» — for the «Моё · …» marks. */
export function methodLabel(method: BirthMethod): string {
  return method === 'sun' ? 'по дате' : 'по времени';
}
