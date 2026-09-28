import * as DocumentPicker from 'expo-document-picker';

export type MediaKind = 'image' | 'audio' | 'video';

export type PickedFile = {
    uri: string;
    name: string;
    mimeType: string;
    // только в вебе: настоящий File из <input type="file">
    file?: File;
};

// бэкенд проверяет Content-Type (image/*, audio/* или video/*), а пикер иногда его не знает
// или отдаёт неподходящий (например, video/3gpp для записи диктофона на Android)
const MIME_BY_EXTENSION: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    avif: 'image/avif',
    bmp: 'image/bmp',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/opus',
    webm: 'audio/webm',
    flac: 'audio/flac',
    amr: 'audio/amr',
    '3gp': 'audio/3gpp',
    '3gpp': 'audio/3gpp',
    aif: 'audio/aiff',
    aiff: 'audio/aiff',
    caf: 'audio/x-caf',
    wma: 'audio/x-ms-wma',
};

// у видео свои типы: те же расширения (mp4, webm, 3gp) выше записаны как аудио
const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
    mp4: 'video/mp4',
    m4v: 'video/x-m4v',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    '3gp': 'video/3gpp',
    '3gpp': 'video/3gpp',
};

const DEFAULT_MIME: Record<MediaKind, string> = {
    image: 'image/jpeg',
    audio: 'audio/mpeg',
    video: 'video/mp4',
};

function guessMimeType(name: string, kind: MediaKind): string {
    const extension = name.split('.').pop()?.toLowerCase() ?? '';
    const known = kind === 'video' ? VIDEO_MIME_BY_EXTENSION[extension] : MIME_BY_EXTENSION[extension];
    return known ?? DEFAULT_MIME[kind];
}

export async function pickFile(kind: MediaKind): Promise<PickedFile | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: `${kind}/*`,
        copyToCacheDirectory: true,
        base64: false,
    });
    if (result.canceled) return null;

    const asset = result.assets[0];
    const mimeType = asset.mimeType?.startsWith(`${kind}/`) ? asset.mimeType : guessMimeType(asset.name, kind);
    return { uri: asset.uri, name: asset.name, mimeType, file: asset.file };
}
