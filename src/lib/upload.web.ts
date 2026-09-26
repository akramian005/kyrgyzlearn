import type { PickedFile } from '@/lib/files';

export type UploadResponse = { status: number; body: string };

// Веб: обычный fetch браузера с FormData и настоящим File из <input type="file">.
// Сетевая ошибка — reject; любой ответ сервера (в т.ч. 4xx/5xx) — resolve со статусом.
export async function uploadFile(url: string, token: string | null, picked: PickedFile): Promise<UploadResponse> {
    const form = new FormData();
    if (picked.file) {
        // тип задаём явно: браузер иногда не знает его для редких форматов (.amr, .caf и т.п.)
        form.append('file', new Blob([picked.file], { type: picked.mimeType }), picked.name);
    } else {
        form.append('file', await (await fetch(picked.uri)).blob(), picked.name);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
    });
    return { status: response.status, body: await response.text() };
}
