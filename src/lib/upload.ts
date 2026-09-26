import { File, UploadType } from 'expo-file-system';

import type { PickedFile } from '@/lib/files';

export type UploadResponse = { status: number; body: string };

// Телефон: глобальный fetch в Expo (expo/fetch) не понимает файлы в FormData вида { uri, name, type },
// поэтому отправляем файл нативной загрузкой expo-file-system — она читает файл с диска потоком.
// Сетевая ошибка — reject; любой ответ сервера (в т.ч. 4xx/5xx) — resolve со статусом.
export async function uploadFile(url: string, token: string | null, picked: PickedFile): Promise<UploadResponse> {
    const result = await new File(picked.uri).upload(url, {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: picked.mimeType,
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    return { status: result.status, body: result.body };
}
