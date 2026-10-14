import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ErrorBanner } from '@/components/app-ui';
import { FormHeader } from '@/components/editor/form-header';
import { MarkdownField } from '@/components/editor/markdown-field';
import { MediaField } from '@/components/editor/media-field';
import { MESSAGE_TEXT_STYLE } from '@/components/player/message-step';
import { AppColors } from '@/constants/app-colors';
import { validateMessage, type MessageDraft } from '@/lib/lesson-drafts';

// Сообщение-объяснение: показывается ученику между вопросами (новое слово, правило и т.п.)
export function MessageForm({ initial, isNew, onSave, onCancel }: {
    initial: MessageDraft;
    isNew: boolean;
    onSave: (draft: MessageDraft) => Promise<void>;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const validationError = validateMessage(draft);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await onSave(draft);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось сохранить сообщение');
            setSaving(false);
        }
    };

    return (
        <Card style={styles.form}>
            <FormHeader title={isNew ? 'Новое сообщение' : 'Редактирование сообщения'} onClose={onCancel} />

            <MediaField kind="image" label="Картинка (необязательно)" draft={draft.image} onChange={(image) => setDraft((d) => ({ ...d, image }))} />
            <MediaField kind="audio" label="Аудио (необязательно)" draft={draft.audio} onChange={(audio) => setDraft((d) => ({ ...d, audio }))} />

            <MarkdownField
                label="Текст"
                value={draft.text}
                onChangeText={(text) => setDraft((d) => ({ ...d, text }))}
                placeholder="Например: «Салам» — так здороваются в Кыргызстане"
                previewStyle={MESSAGE_TEXT_STYLE}
            />

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
    buttons: {
        flexDirection: 'row',
        gap: 12,
    },
    flex: {
        flex: 1,
    },
});
