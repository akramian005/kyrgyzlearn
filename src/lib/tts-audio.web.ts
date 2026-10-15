import type { TempAudio } from './tts-audio';

// Озвучка в вебе: WAV живёт только в памяти браузера (blob-ссылка), «Скачать» сохраняет его обычной загрузкой

export function toTempAudio(bytes: Uint8Array): TempAudio {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/wav' }));
    return { uri: url, dispose: () => URL.revokeObjectURL(url) };
}

export async function downloadAudio(bytes: Uint8Array, fileName: string): Promise<boolean> {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/wav' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    // браузер успевает начать загрузку — ссылку можно отпустить
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
}
