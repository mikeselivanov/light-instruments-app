import { useEffect } from 'react';

/**
 * Держит экран незагашенным, пока `active`.
 *
 * Практики идут по 3–10 минут, и в созерцании за всё это время не случается ни
 * одного касания — браузер гасит подсветку примерно через полминуты, и практика
 * перестаёт работать.
 *
 * Две тонкости. Блокировка снимается браузером сама, когда вкладка уходит на
 * фон, поэтому её приходится запрашивать заново на visibilitychange. И API есть
 * не везде — в Safari он появился только в 16.4, — так что и проверка наличия, и
 * try/catch здесь обязательны: практика без Wake Lock работает хуже, но работает.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const next = await (navigator as any).wakeLock.request('screen');
        if (cancelled) {
          next.release().catch(() => {});
          return;
        }
        sentinel = next;
      } catch {
        // Отказ браузера — не повод падать.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
