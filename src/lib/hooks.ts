import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSession } from '@/auth/session';
import { createApi, isConnectionError, type Api } from '@/lib/api';
import { readCached, readCachedNow, writeCached } from '@/lib/cache';

// API с токеном текущего пользователя; если токен протух (401) — выходим из аккаунта
export function useApi(): Api {
    const { session, signOut } = useSession();
    const token = session?.token ?? null;

    return useMemo(() => createApi(token, signOut), [token, signOut]);
}

// Текст ошибки для баннера на экране. null — ошибка связи: о ней уже сообщило
// всплывающее уведомление (см. api.ts), и на экране её не повторяем.
export function errorMessage(e: unknown): string | null {
    if (isConnectionError(e)) return null;
    return e instanceof Error ? e.message : 'Что-то пошло не так';
}

type LoaderState<T> = {
    data: T | undefined;
    error: string | null;
    loading: boolean;
    // последний запрос не дошёл до сервера — экран без данных показывает OfflineState
    offline: boolean;
};

// Загружает данные при каждом открытии экрана (в т.ч. при возврате назад),
// чтобы после правок на другом экране список был актуальным.
// cacheKey — сохранять последние данные (отдельно для каждого аккаунта): экран сразу
// показывает их, пока идёт запрос, а без связи с сервером остаётся с ними.
export function useLoader<T>(load: () => Promise<T>, cacheKey?: string) {
    const { session } = useSession();
    const key = cacheKey && session ? `${session.email}:${cacheKey}` : null;

    const [state, setState] = useState<LoaderState<T>>(() => {
        const cached = key ? readCachedNow<T>(key) : undefined;
        return { data: cached, error: null, loading: cached === undefined, offline: false };
    });

    // после перезапуска приложения кэша в памяти нет — поднимаем с диска,
    // если сервер ещё не ответил раньше
    useEffect(() => {
        if (!key) return;
        void readCached<T>(key).then((cached) => {
            if (cached === undefined) return;
            setState((prev) => (prev.data === undefined ? { ...prev, data: cached, loading: false } : prev));
        });
    }, [key]);

    // держим последнюю версию load, чтобы reload был стабильным и не перезапускал эффект фокуса
    const latestLoad = useRef(load);
    useEffect(() => {
        latestLoad.current = load;
    });

    const reload = useCallback(async () => {
        try {
            const data = await latestLoad.current();
            if (key) writeCached(key, data);
            setState({ data, error: null, loading: false, offline: false });
        } catch (e) {
            setState((prev) => ({ ...prev, error: errorMessage(e), loading: false, offline: isConnectionError(e) }));
        }
    }, [key]);

    useFocusEffect(useCallback(() => {
        void reload();
    }, [reload]));

    const setData = (data: T) => {
        if (key) writeCached(key, data);
        setState({ data, error: null, loading: false, offline: false });
    };

    return { ...state, reload, setData };
}
