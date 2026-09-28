import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, ErrorBanner, Muted, TextField } from '@/components/app-ui';
import { MediaField } from '@/components/editor/media-field';
import { AppColors } from '@/constants/app-colors';
import { validateVideo, type VideoDraft } from '@/lib/video-drafts';

// Видео курса: стоит в списке курса между уроками, ученик смотрит его отдельно от уроков
export function VideoForm({ initial, isNew, onSave, onCancel }: {
    initial: VideoDraft;
    isNew: boolean;
    onSave: (draft: VideoDraft) => Promise<void>;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const validationError = validateVideo(draft);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await onSave(draft);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось сохранить видео');
            setSaving(false);
        }
    };

    return (
        <Card style={styles.form}>
            <Text style={styles.formTitle}>{isNew ? 'Новое видео' : 'Редактирование видео'}</Text>

            <TextField
                label="Название"
                value={draft.title}
                onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
                placeholder="Например: Как здороваться по-кыргызски"
            />
            <TextField
                label="Описание (необязательно)"
                value={draft.description}
                onChangeText={(description) => setDraft((d) => ({ ...d, description }))}
                multiline
            />

            <MediaField kind="video" label="Файл видео" draft={draft.file} onChange={(file) => setDraft((d) => ({ ...d, file }))} />
            <Muted style={styles.hint}>До 500 МБ. Лучше всего MP4 — он играет и на телефоне, и в браузере.</Muted>

            <ErrorBanner message={error} />

            <View style={styles.buttons}>
                <Button title="Отмена" variant="ghost" onPress={onCancel} style={styles.flex} />
                <Button title="Сохранить" icon="checkmark" onPress={handleSave} loading={saving} style={styles.flex} />
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    form: {
        borderColor: AppColors.blue,
    },
    formTitle: {
        color: AppColors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
    },
    hint: {
        marginTop: -8,
        marginBottom: 16,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
    },
    flex: {
        flex: 1,
    },
});
