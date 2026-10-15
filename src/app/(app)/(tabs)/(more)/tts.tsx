import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/audio-button';
import { Button, Card, ErrorBanner, Muted, Page, ScreenHeader, TextField } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { ApiError } from '@/lib/api';
import { errorMessage, useApi } from '@/lib/hooks';
import { downloadAudio, toTempAudio, type TempAudio } from '@/lib/tts-audio';

// столько же принимает бэкенд (TtsRequest) и сервис озвучки
const MAX_LENGTH = 300;

// «Генерация речи»: ввод кыргызского текста и кнопка «Озвучить». Бэкенд передаёт текст сервису озвучки
// (kyrgyz-learn-tts) и сразу возвращает WAV — на сервере он не хранится. Здесь звук живёт во временном
// файле, пока открыт экран: его можно прослушать и скачать, потом он удаляется.
export default function TtsScreen() {
    const api = useApi();
    const [text, setText] = useState('');
    const [result, setResult] = useState<{ text: string; bytes: Uint8Array; audio: TempAudio } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    // новый звук или уход с экрана — прежний временный файл больше не нужен
    useEffect(() => () => result?.audio.dispose(), [result]);

    const synthesize = async () => {
        const value = text.trim();
        if (!value) {
            setError('Введите текст');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const bytes = await api.tts.synthesize(value);
            setResult({ text: value, bytes, audio: toTempAudio(bytes) });
            setSaved(false);
        } catch (e) {
            setError(ttsErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    const download = async () => {
        if (!result) return;
        try {
            setSaved(await downloadAudio(result.bytes, audioFileName()));
        } catch (e) {
            setError(errorMessage(e) ?? 'Не удалось сохранить файл');
        }
    };

    return (
        <View style={styles.screen}>
            <ScreenHeader title="Генерация речи" />
            <Page>
                <Muted style={styles.hint}>Введите текст на кыргызском — приложение его озвучит.</Muted>

                <TextField
                    label="Текст"
                    value={text}
                    onChangeText={setText}
                    placeholder="Мисалы: Сиздин атыңыз ким?"
                    multiline
                    maxLength={MAX_LENGTH}
                />
                <Text style={styles.counter}>{text.length} / {MAX_LENGTH}</Text>

                <ErrorBanner message={error} />
                <Button title={loading ? 'Озвучиваем…' : 'Озвучить'} icon="volume-high" onPress={synthesize} loading={loading} />
                {loading ? <Muted style={styles.wait}>Генерация может занять до минуты</Muted> : null}

                {result ? (
                    <Card style={styles.result}>
                        <View style={styles.resultRow}>
                            {/* key — новый плеер для нового файла */}
                            <AudioButton key={result.audio.uri} url={result.audio.uri} large />
                            <Text style={styles.resultText}>{result.text}</Text>
                        </View>
                        <Button title="Скачать" icon="download-outline" variant="secondary" small onPress={download} />
                        {saved ? <Muted style={styles.saved}>Файл сохранён</Muted> : null}
                    </Card>
                ) : null}
            </Page>
        </View>
    );
}

// ilbi-2026-10-16-0042.wav
function audioFileName(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `ilbi-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.wav`;
}

function ttsErrorMessage(e: unknown): string | null {
    if (e instanceof ApiError && (e.status === 503 || e.status === 502)) {
        return 'Сервис озвучки сейчас недоступен. Попробуйте позже.';
    }
    return errorMessage(e);
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    hint: {
        marginBottom: 16,
    },
    counter: {
        alignSelf: 'flex-end',
        color: AppColors.textSecondary,
        fontSize: 12,
        marginTop: -8,
        marginBottom: 12,
    },
    wait: {
        marginTop: 8,
        textAlign: 'center',
    },
    result: {
        marginTop: 20,
        gap: 14,
        borderColor: AppColors.blue,
    },
    saved: {
        textAlign: 'center',
        marginTop: -6,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    resultText: {
        flex: 1,
        color: AppColors.text,
        fontSize: 17,
        fontWeight: '600',
    },
});
