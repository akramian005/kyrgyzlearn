// Веб-версия cache.ts: те же функции, но на localStorage.
// typeof-проверка нужна для статического рендера веба (он идёт в Node, где localStorage нет).

const memory = new Map<string, unknown>();
const PREFIX = 'cache:';

export function readCachedNow<T>(key: string): T | undefined {
    return memory.get(key) as T | undefined;
}

export async function readCached<T>(key: string): Promise<T | undefined> {
    if (memory.has(key)) return memory.get(key) as T;
    try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PREFIX + key) : null;
        if (raw === null) return undefined;
        const value = JSON.parse(raw) as T;
        memory.set(key, value);
        return value;
    } catch {
        return undefined;
    }
}

export function writeCached(key: string, value: unknown) {
    memory.set(key, value);
    try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
        // приватный режим или переполнен — останется в памяти до перезагрузки страницы
    }
}
