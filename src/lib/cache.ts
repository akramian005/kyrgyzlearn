import { File, Paths } from 'expo-file-system';

// Последние загруженные данные экранов (см. useLoader): экран сразу показывает их,
// пока идёт запрос, — и при отсутствии связи остаётся с ними, а не с пустым экраном.
// Телефон: файлы в папке документов приложения; веб — cache.web.ts.

const memory = new Map<string, unknown>();

function fileFor(key: string): File {
    return new File(Paths.document, `cache-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
}

// из памяти — синхронно, чтобы экран при возврате на него не мигал загрузкой
export function readCachedNow<T>(key: string): T | undefined {
    return memory.get(key) as T | undefined;
}

export async function readCached<T>(key: string): Promise<T | undefined> {
    if (memory.has(key)) return memory.get(key) as T;
    try {
        const file = fileFor(key);
        if (!file.exists) return undefined;
        const value = JSON.parse(await file.text()) as T;
        memory.set(key, value);
        return value;
    } catch {
        return undefined; // кэш испорчен или недоступен — просто грузим с сервера
    }
}

export function writeCached(key: string, value: unknown) {
    memory.set(key, value);
    try {
        const file = fileFor(key);
        if (!file.exists) file.create();
        file.write(JSON.stringify(value));
    } catch {
        // не сохранилось на диск — останется в памяти до перезапуска
    }
}
