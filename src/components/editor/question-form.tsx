import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ErrorBanner, IconButton, Segmented } from '@/components/app-ui';
import { MarkdownField } from '@/components/editor/markdown-field';
import { MediaField } from '@/components/editor/media-field';
import { QUESTION_TEXT_STYLE } from '@/components/player/question-step';
import { AppColors } from '@/constants/app-colors';
import {
    changeQuestionType,
    newOption,
    validateQuestion,
    type OptionDraft,
    type QuestionDraft,
} from '@/lib/lesson-drafts';
import { QUESTION_TYPE_LABELS, type QuestionType } from '@/lib/types';

const TYPE_OPTIONS = (Object.keys(QUESTION_TYPE_LABELS) as QuestionType[])
    .map((value) => ({ value, label: QUESTION_TYPE_LABELS[value] }));

const TYPE_HINTS: Record<QuestionType, string> = {
    SINGLE_CHOICE: 'Отметьте кружком единственный правильный вариант.',
    MULTIPLE_CHOICE: 'Отметьте все правильные варианты — ученик должен выбрать их все.',
    ORDER: 'Ученик собирает ответ из вариантов по порядку. Отмеченные варианты — правильная последовательность '
        + '(расставьте их стрелками), неотмеченные — лишние, для сложности.',
};

export function QuestionForm({ initial, isNew, onSave, onCancel }: {
    initial: QuestionDraft;
    isNew: boolean;
    onSave: (draft: QuestionDraft) => Promise<void>;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const updateOption = (key: string, patch: Partial<OptionDraft>) =>
        setDraft((d) => ({ ...d, options: d.options.map((o) => (o.key === key ? { ...o, ...patch } : o)) }));

    const toggleCorrect = (key: string) =>
        setDraft((d) => ({
            ...d,
            options: d.options.map((o) => {
                if (d.type === 'SINGLE_CHOICE') return { ...o, correct: o.key === key };
                return o.key === key ? { ...o, correct: !o.correct } : o;
            }),
        }));

    const moveOption = (index: number, delta: -1 | 1) =>
        setDraft((d) => {
            const options = [...d.options];
            const target = index + delta;
            if (target < 0 || target >= options.length) return d;
            [options[index], options[target]] = [options[target], options[index]];
            return { ...d, options };
        });

    const removeOption = (key: string) =>
        setDraft((d) => ({ ...d, options: d.options.filter((o) => o.key !== key) }));

    const handleSave = async () => {
        const validationError = validateQuestion(draft);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await onSave(draft);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось сохранить вопрос');
            setSaving(false);
        }
    };

    // номер варианта в правильной последовательности (для ORDER), null — лишний вариант
    const orderNumbers: (number | null)[] = [];
    let counter = 0;
    for (const option of draft.options) {
        orderNumbers.push(option.inAnswer ? ++counter : null);
    }

    return (
        <Card style={styles.form}>
            <Text style={styles.formTitle}>{isNew ? 'Новый вопрос' : 'Редактирование вопроса'}</Text>

            <MarkdownField
                label="Текст вопроса"
                value={draft.text}
                onChangeText={(text) => setDraft((d) => ({ ...d, text }))}
                placeholder="Например: Как перевести «Салам»?"
                previewStyle={QUESTION_TEXT_STYLE}
            />

            <Text style={styles.label}>Тип вопроса</Text>
            <Segmented value={draft.type} options={TYPE_OPTIONS} onChange={(type) => setDraft((d) => changeQuestionType(d, type))} />
            <Text style={styles.hint}>{TYPE_HINTS[draft.type]}</Text>

            <Text style={styles.label}>Варианты ответа</Text>
            {draft.options.map((option, index) => {
                const number = draft.type === 'ORDER' ? orderNumbers[index] : null;
                return (
                    <View key={option.key} style={styles.optionRow}>
                        <OptionMarker
                            type={draft.type}
                            option={option}
                            number={number}
                            onPress={() => (draft.type === 'ORDER'
                                ? updateOption(option.key, { inAnswer: !option.inAnswer })
                                : toggleCorrect(option.key))}
                        />
                        <TextInput
                            value={option.text}
                            onChangeText={(text) => updateOption(option.key, { text })}
                            placeholder={`Вариант ${index + 1}`}
                            placeholderTextColor={AppColors.textSecondary}
                            style={styles.optionInput}
                        />
                        {draft.type === 'ORDER' ? (
                            <>
                                <IconButton icon="chevron-up" label="Выше" onPress={() => moveOption(index, -1)} disabled={index === 0} />
                                <IconButton
                                    icon="chevron-down"
                                    label="Ниже"
                                    onPress={() => moveOption(index, 1)}
                                    disabled={index === draft.options.length - 1}
                                />
                            </>
                        ) : null}
                        <IconButton icon="close" label="Удалить вариант" color={AppColors.error} onPress={() => removeOption(option.key)} />
                    </View>
                );
            })}

            <Button
                title="Добавить вариант"
                icon="add"
                variant="secondary"
                small
                onPress={() => setDraft((d) => ({ ...d, options: [...d.options, newOption()] }))}
                style={styles.addOption}
            />

            <MediaField kind="audio" label="Аудио к вопросу (необязательно)" draft={draft.audio} onChange={(audio) => setDraft((d) => ({ ...d, audio }))} />

            <ErrorBanner message={error} />

            <View style={styles.buttons}>
                <Button title="Отмена" variant="ghost" onPress={onCancel} style={styles.flex} />
                <Button title="Сохранить" icon="checkmark" onPress={handleSave} loading={saving} style={styles.flex} />
            </View>
        </Card>
    );
}

// Отметка правильности слева от варианта: кружок (один ответ), квадрат (несколько) или номер (последовательность)
function OptionMarker({ type, option, number, onPress }: {
    type: QuestionType;
    option: OptionDraft;
    number: number | null;
    onPress: () => void;
}) {
    if (type === 'ORDER') {
        return (
            <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: option.inAnswer }}
                accessibilityLabel="Входит в правильный ответ"
                onPress={onPress}
                style={[styles.orderMarker, option.inAnswer && styles.markerActive]}
            >
                {number !== null
                    ? <Text style={styles.orderNumber}>{number}</Text>
                    : <Ionicons name="remove" size={16} color={AppColors.textSecondary} />}
            </Pressable>
        );
    }

    const single = type === 'SINGLE_CHOICE';
    return (
        <Pressable
            accessibilityRole={single ? 'radio' : 'checkbox'}
            accessibilityState={single ? { selected: option.correct } : { checked: option.correct }}
            accessibilityLabel="Правильный ответ"
            onPress={onPress}
            hitSlop={6}
            style={[styles.marker, single && styles.markerRound, option.correct && styles.markerActive]}
        >
            {option.correct ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
        </Pressable>
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
    label: {
        color: AppColors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    hint: {
        color: AppColors.textSecondary,
        fontSize: 13,
        marginTop: -8,
        marginBottom: 16,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    optionInput: {
        flex: 1,
        backgroundColor: AppColors.background,
        borderColor: AppColors.border,
        borderWidth: 2,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: AppColors.text,
        fontSize: 15,
    },
    marker: {
        width: 28,
        height: 28,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: AppColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerRound: {
        borderRadius: 14,
    },
    markerActive: {
        backgroundColor: AppColors.accent,
        borderColor: AppColors.accent,
    },
    orderMarker: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: AppColors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderNumber: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
    addOption: {
        alignSelf: 'flex-start',
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
