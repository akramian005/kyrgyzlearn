import { Directory, File, Paths } from 'expo-file-system';

// Озвучка на телефоне: WAV лежит во временном файле (кэш приложения), пока открыт экран,
// потом удаляется. «Скачать» — пользователь выбирает папку, туда пишется копия. Веб — tts-audio.web.ts

export type TempAudio = {
    // что проигрывать (file:// на телефоне, blob: в вебе)
    uri: string;
    // удалить временный файл — когда звук больше не нужен
    dispose: () => void;
};

export function toTempAudio(bytes: Uint8Array): TempAudio {
    const file = new File(Paths.cache, `tts-${Date.now()}.wav`);
    file.create({ overwrite: true });
    file.write(bytes);
    return {
        uri: file.uri,
        dispose: () => {
            try {
                if (file.exists) file.delete();
            } catch {
                // не удалился — система всё равно чистит кэш сама
            }
        },
    };
}

// false — пользователь закрыл выбор папки
export async function downloadAudio(bytes: Uint8Array, fileName: string): Promise<boolean> {
    let directory: Directory;
    try {
        directory = await Directory.pickDirectoryAsync();
    } catch {
        return false;
    }
    directory.createFile(fileName, 'audio/wav').write(bytes);
    return true;
}
