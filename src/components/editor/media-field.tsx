import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/audio-button';
import { Button } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { pickFile, type MediaKind, type PickedFile } from '@/lib/files';

// Состояние картинки/аудио в форме: что уже есть на сервере и что пользователь поменял
export type MediaDraft = {
    url: string | null;         // текущий файл на сервере
    picked: PickedFile | null;  // новый файл, загрузится при сохранении
    removed: boolean;           // пользователь убрал текущий файл
};

export const emptyMedia = (url: string | null = null): MediaDraft => ({ url, picked: null, removed: false });

export function mediaPreview(draft: MediaDraft): string | null {
    if (draft.picked) return draft.picked.uri;
    return draft.removed ? null : draft.url;
}

export function MediaField({ kind, label, draft, onChange }: {
    kind: MediaKind;
    label: string;
    draft: MediaDraft;
    onChange: (draft: MediaDraft) => void;
}) {
    const preview = mediaPreview(draft);

    const choose = async () => {
        const picked = await pickFile(kind);
        if (picked) onChange({ ...draft, picked, removed: false });
    };

    const remove = () => onChange({ ...draft, picked: null, removed: true });

    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>

            {preview ? (
                <View style={styles.previewRow}>
                    {kind === 'image' ? (
                        <Image source={{ uri: preview }} style={styles.image} contentFit="cover" />
                    ) : (
                        <AudioButton key={preview} url={preview} />
                    )}
                    {draft.picked ? <Text style={styles.fileName} numberOfLines={1}>{draft.picked.name}</Text> : null}
                </View>
            ) : null}

            <View style={styles.buttons}>
                <Button
                    title={preview ? 'Заменить' : kind === 'image' ? 'Выбрать картинку' : 'Выбрать аудио'}
                    icon={kind === 'image' ? 'image-outline' : 'musical-notes-outline'}
                    variant="secondary"
                    small
                    onPress={choose}
                />
                {preview ? <Button title="Убрать" icon="close" variant="danger" small onPress={remove} /> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    field: {
        marginBottom: 16,
        gap: 8,
    },
    label: {
        color: AppColors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    image: {
        width: 120,
        height: 90,
        borderRadius: 10,
        backgroundColor: AppColors.surfaceRaised,
    },
    fileName: {
        flexShrink: 1,
        color: AppColors.textSecondary,
        fontSize: 13,
    },
    buttons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
});
