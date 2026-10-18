import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => {};
      }
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onStoreChange);
      return () => {
        mediaQuery.removeEventListener('change', onStoreChange);
      };
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false),
    () => false
  );
}

