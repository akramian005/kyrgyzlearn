import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';

import { ApiError, authApi, type AuthResponse } from '@/lib/api';
import { getStorageItem, setStorageItem } from '@/lib/storage';

const SESSION_KEY = 'session';

export type Session = AuthResponse;

type SessionContextValue = {
    session: Session | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
    const value = use(SessionContext);
    if (!value) {
        throw new Error('useSession must be wrapped in a <SessionProvider />');
    }
    return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // при запуске поднимаем сохранённую сессию
    useEffect(() => {
        getStorageItem(SESSION_KEY)
            .then((raw) => setSession(raw ? (JSON.parse(raw) as Session) : null))
            .catch(() => setSession(null))
            .finally(() => setIsLoading(false));
    }, []);

    const saveSession = useCallback((value: Session | null) => {
        setSession(value);
        setStorageItem(SESSION_KEY, value ? JSON.stringify(value) : null);
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            saveSession(await authApi.login(email, password));
        } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
                throw new Error('Неверный email или пароль');
            }
            throw e;
        }
    }, [saveSession]);

    const signUp = useCallback(async (email: string, password: string) => {
        try {
            saveSession(await authApi.register(email, password));
        } catch (e) {
            if (e instanceof ApiError && e.status === 409) {
                throw new Error('Этот email уже зарегистрирован');
            }
            throw e;
        }
    }, [saveSession]);

    const signOut = useCallback(() => saveSession(null), [saveSession]);

    return (
        <SessionContext value={{ session, isLoading, signIn, signUp, signOut }}>
            {children}
        </SessionContext>
    );
}
