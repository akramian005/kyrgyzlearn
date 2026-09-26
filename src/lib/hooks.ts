import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSession } from '@/auth/session';
import { createApi, type Api } from '@/lib/api';

// API с токеном текущего пользователя; если токен протух (401) — выходим из аккаунта
export function useApi(): Api {
    const { session, signOut } = useSession();
    const token = session?.token ?? null;

    return useMemo(() => createApi(token, signOut), [token, signOut]);
}

export function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : 'Что-то пошло не так';
}

type LoaderState<T> = {
    data: T | undefined;
    error: string | null;
    loading: boolean;
};

// Загружает данные при каждом открытии экрана (в т.ч. при возврате назад),
// чтобы после правок на другом экране список был актуальным
export function useLoader<T>(load: () => Promise<T>) {
    const [state, setState] = useState<LoaderState<T>>({ data: undefined, error: null, loading: true });

    // держим последнюю версию load, чтобы reload был стабильным и не перезапускал эффект фокуса
    const latestLoad = useRef(load);
    useEffect(() => {
        latestLoad.current = load;
    });

    const reload = useCallback(async () => {
        try {
            const data = await latestLoad.current();
            setState({ data, error: null, loading: false });
        } catch (e) {
            setState((prev) => ({ ...prev, error: errorMessage(e), loading: false }));
        }
    }, []);

    useFocusEffect(useCallback(() => {
        void reload();
    }, [reload]));

    const setData = (data: T) => setState({ data, error: null, loading: false });

    return { ...state, reload, setData };
}
