import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

// Веб на компьютере (есть мышь/тачпад) — в отличие от браузера на телефоне.
// Нужен, чтобы показывать то, что удобно только мышью: например, стрелки «выше/ниже» в редакторе.
const QUERY = '(pointer: fine)';

function subscribe(onChange: () => void) {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const media = window.matchMedia(QUERY);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
}

function snapshot(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches;
}

export function useIsDesktopWeb(): boolean {
    // при статическом рендере веба (в Node) окна нет — считаем, что не ПК, и уточняем в браузере
    const desktop = useSyncExternalStore(subscribe, snapshot, () => false);
    return Platform.OS === 'web' && desktop;
}
