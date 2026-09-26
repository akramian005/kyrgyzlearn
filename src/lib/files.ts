import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

export type MediaKind = 'image' | 'audio';

export type PickedFile = {
    uri: string;
    name: string;
    mimeType: string;
    // только в вебе: настоящий File из <input type="file">
    file?: File;
};

// бэкенд проверяет Content-Type (image/* или audio/*), а пикер иногда его не знает
const MIME_BY_EXTENSION: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/opus',
    webm: 'audio/webm',
};

function guessMimeType(name: string, kind: MediaKind): string {
    const extension = name.split('.').pop()?.toLowerCase() ?? '';
    return MIME_BY_EXTENSION[extension] ?? (kind === 'image' ? 'image/jpeg' : 'audio/mpeg');
}

export async function pickFile(kind: MediaKind): Promise<PickedFile | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: kind === 'image' ? 'image/*' : 'audio/*',
        copyToCacheDirectory: true,
        base64: false,
    });
    if (result.canceled) return null;

    const asset = result.assets[0];
    const mimeType = asset.mimeType?.startsWith(`${kind}/`) ? asset.mimeType : guessMimeType(asset.name, kind);
    return { uri: asset.uri, name: asset.name, mimeType, file: asset.file };
}

export function toFormData(picked: PickedFile): FormData {
    const form = new FormData();
    if (Platform.OS === 'web' && picked.file) {
        form.append('file', picked.file, picked.name);
    } else {
        // React Native отправляет файл по uri — такой объект понимает только RN-реализация FormData
        form.append('file', { uri: picked.uri, name: picked.name, type: picked.mimeType } as unknown as Blob);
    }
    return form;
}
