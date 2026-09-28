import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
    Button,
    EmptyState,
    ErrorBanner,
    IconButton,
    LoadingView,
    Muted,
    Page,
    ScreenHeader,
    SectionTitle,
    TextField,
} from '@/components/app-ui';
import { ItemCard } from '@/components/editor/item-card';
import { MarkdownField } from '@/components/editor/markdown-field';
import { DESCRIPTION_TEXT_STYLE, markdownToPlain } from '@/components/markdown';
import { MessageForm } from '@/components/editor/message-form';
import { QuestionForm } from '@/components/editor/question-form';
import { AppColors } from '@/constants/app-colors';
import { confirmAsync } from '@/lib/confirm';
import { errorMessage, useApi, useLoader } from '@/lib/hooks';
import {
    messageToDraft,
    newMessageDraft,
    newQuestionDraft,
    questionToDraft,
    saveMessage,
    saveQuestion,
} from '@/lib/lesson-drafts';
import type { Lesson, LessonItem } from '@/lib/types';

type ItemKind = 'question' | 'message';

// что сейчас открыто в редакторе: новый шаг на позиции position или существующий шаг
type Editing =
    | { mode: 'new'; kind: ItemKind; position: number }
    | { mode: 'edit'; itemId: number };

// Редактор урока: вопросы и сообщения идут одним списком, между любыми шагами можно вставить новый
export default function LessonEditorScreen() {
    const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
    const id = Number(lessonId);
    const api = useApi();

    const { data: lesson, error, loading, reload, setData } = useLoader(() => api.lessons.get(id));
    const [editing, setEditing] = useState<Editing | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const run = async (action: () => Promise<void>) => {
        setActionError(null);
        try {
            await action();
        } catch (e) {
            setActionError(errorMessage(e));
            await reload();
        }
    };

    const move = (item: LessonItem, delta: -1 | 1) =>
        run(async () => setData(await api.lessons.moveItem(id, item.id, item.position + delta)));

    const remove = async (item: LessonItem) => {
        const what = item.kind === 'QUESTION' ? 'вопрос' : 'сообщение';
        if (!(await confirmAsync(`Удалить ${what}?`, `«${markdownToPlain(item.text)}»`))) return;
        await run(async () => {
            if (item.kind === 'QUESTION') await api.questions.remove(id, item.id);
            else await api.messages.remove(id, item.id);
            await reload();
        });
    };

    const afterSave = async () => {
        setEditing(null);
        await reload();
    };

    const renderNewForm = (kind: ItemKind, position: number) => kind === 'question' ? (
        <QuestionForm
            initial={newQuestionDraft()}
            isNew
            onCancel={() => setEditing(null)}
            onSave={async (draft) => {
                await saveQuestion(api, id, null, draft, position);
                await afterSave();
            }}
        />
    ) : (
        <MessageForm
            initial={newMessageDraft()}
            isNew
            onCancel={() => setEditing(null)}
            onSave={async (draft) => {
                await saveMessage(api, id, null, draft, position);
                await afterSave();
            }}
        />
    );

    const renderEditForm = (item: LessonItem) => item.kind === 'QUESTION' ? (
        <QuestionForm
            initial={questionToDraft(item)}
            isNew={false}
            onCancel={() => setEditing(null)}
            onSave={async (draft) => {
                await saveQuestion(api, id, item, draft);
                await afterSave();
            }}
        />
    ) : (
        <MessageForm
            initial={messageToDraft(item)}
            isNew={false}
            onCancel={() => setEditing(null)}
            onSave={async (draft) => {
                await saveMessage(api, id, item, draft);
                await afterSave();
            }}
        />
    );

    // место между шагами: «+» раскрывается в выбор «вопрос / сообщение» или показывает форму нового шага
    const renderSlot = (position: number, isEnd: boolean) => {
        if (editing?.mode === 'new' && editing.position === position) {
            return <View key={`slot-${position}`} style={styles.slotForm}>{renderNewForm(editing.kind, position)}</View>;
        }
        return (
            <InsertSlot
                key={`slot-${position}`}
                expanded={isEnd}
                onAdd={(kind) => setEditing({ mode: 'new', kind, position })}
            />
        );
    };

    return (
        <View style={styles.screen}>
            <ScreenHeader
                title={lesson?.title ?? 'Урок'}
                right={lesson && lesson.items.length > 0 ? (
                    <IconButton
                        icon="play-circle"
                        label="Пройти урок"
                        color={AppColors.accent}
                        onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: id } })}
                    />
                ) : null}
            />

            {loading && !lesson ? <LoadingView /> : (
                <Page>
                    <ErrorBanner message={error ?? actionError} />

                    {lesson ? (
                        <>
                            <LessonMetaForm key={lesson.id} lesson={lesson} onSaved={reload} />

                            <SectionTitle>Шаги урока</SectionTitle>
                            <Muted style={styles.hint}>
                                Ученик проходит шаги сверху вниз. Сообщения объясняют новое слово или правило перед вопросами —
                                нажмите «+» между шагами, чтобы вставить что-то в нужное место.
                            </Muted>

                            {lesson.items.length === 0 && editing === null ? (
                                <EmptyState icon="list-outline" title="Урок пока пустой" text="Добавьте первый вопрос или сообщение" />
                            ) : null}

                            {lesson.items.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    {renderSlot(index, false)}
                                    {editing?.mode === 'edit' && editing.itemId === item.id ? renderEditForm(item) : (
                                        <ItemCard
                                            item={item}
                                            isFirst={index === 0}
                                            isLast={index === lesson.items.length - 1}
                                            onEdit={() => setEditing({ mode: 'edit', itemId: item.id })}
                                            onDelete={() => remove(item)}
                                            onMove={(delta) => move(item, delta)}
                                        />
                                    )}
                                </React.Fragment>
                            ))}

                            {renderSlot(lesson.items.length, true)}
                        </>
                    ) : null}
                </Page>
            )}
        </View>
    );
}

function InsertSlot({ expanded, onAdd }: { expanded: boolean; onAdd: (kind: ItemKind) => void }) {
    const [open, setOpen] = useState(expanded);

    if (!open) {
        return (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Вставить шаг сюда"
                onPress={() => setOpen(true)}
                style={({ pressed }) => [styles.slot, pressed && styles.slotPressed]}
            >
                <View style={styles.slotLine} />
                <Text style={styles.slotPlus}>+</Text>
                <View style={styles.slotLine} />
            </Pressable>
        );
    }

    return (
        <View style={[styles.slotButtons, expanded && styles.slotButtonsEnd]}>
            <Button title="Вопрос" icon="help-circle-outline" variant="secondary" small onPress={() => onAdd('question')} style={styles.flex} />
            <Button title="Сообщение" icon="chatbubble-ellipses-outline" variant="secondary" small onPress={() => onAdd('message')} style={styles.flex} />
            {expanded ? null : <IconButton icon="close" label="Отмена" onPress={() => setOpen(false)} />}
        </View>
    );
}

function LessonMetaForm({ lesson, onSaved }: { lesson: Lesson; onSaved: () => Promise<void> }) {
    const api = useApi();
    const [title, setTitle] = useState(lesson.title);
    const [description, setDescription] = useState(lesson.description ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const changed = title.trim() !== lesson.title || (description.trim() || null) !== (lesson.description || null);

    const handleSave = async () => {
        if (!title.trim()) {
            setError('Название не может быть пустым');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await api.lessons.update(lesson.id, { title: title.trim(), description: description.trim() || null });
            await onSaved();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <View>
            <ErrorBanner message={error} />
            <TextField label="Название урока" value={title} onChangeText={setTitle} />
            <MarkdownField
                label="Описание"
                value={description}
                onChangeText={setDescription}
                placeholder="Необязательно"
                previewStyle={DESCRIPTION_TEXT_STYLE}
            />
            {changed ? <Button title="Сохранить" icon="checkmark" onPress={handleSave} loading={saving} /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    hint: {
        marginTop: -6,
        marginBottom: 12,
    },
    slot: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
    },
    slotPressed: {
        opacity: 0.6,
    },
    slotLine: {
        flex: 1,
        height: 2,
        backgroundColor: AppColors.border,
        borderRadius: 1,
    },
    slotPlus: {
        color: AppColors.textSecondary,
        fontSize: 20,
        fontWeight: '800',
        width: 28,
        height: 28,
        lineHeight: 26,
        textAlign: 'center',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: AppColors.border,
        overflow: 'hidden',
    },
    slotButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
    },
    slotButtonsEnd: {
        paddingTop: 16,
    },
    slotForm: {
        paddingVertical: 8,
    },
    flex: {
        flex: 1,
    },
});
