import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ErrorBanner, IconButton, Segmented } from '@/components/app-ui';
import { DraggableList } from '@/components/editor/draggable-list';
import { FormHeader } from '@/components/editor/form-header';
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
import { useIsDesktopWeb } from '@/lib/device';
import { MAX_MATCHING_PAIRS, QUESTION_TYPE_LABELS, type QuestionType } from '@/lib/types';

// строка варианта в «Последовательности» — одной высоты, чтобы их можно было перетаскивать
const ORDER_ROW_HEIGHT = 56;

const TYPE_OPTIONS = (Object.keys(QUESTION_TYPE_LABELS) as QuestionType[])
    .map((value) => ({ value, label: QUESTION_TYPE_LABELS[value] }));

const TYPE_HINTS: Record<QuestionType, string> = {
    SINGLE_CHOICE: 'Отметьте кружком единственный правильный вариант.',
    MULTIPLE_CHOICE: 'Отметьте все правильные варианты — ученик должен выбрать их все.',
    ORDER: 'Ученик собирает ответ из слов по порядку. Слова с номером — правильная последовательность '
        + '(расставьте их, перетащив за ⋮⋮), «Лишнее» — для сложности, в ответ не входит. '
        + 'Нажмите на номер или «Лишнее», чтобы переключить.',
    MATCHING: 'Впишите пары: слово слева и то, что ему соответствует, справа (например, перевод). '
        + `Ученик увидит оба столбца перемешанными и соединит их. До ${MAX_MATCHING_PAIRS} пар.`,
};

const OPTIONS_LABELS: Record<QuestionType, string> = {
    SINGLE_CHOICE: 'Варианты ответа',
    MULTIPLE_CHOICE: 'Варианты ответа',
    ORDER: 'Слова',
    MATCHING: 'Пары',
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
    // стрелки «выше/ниже» — только на ПК, на телефоне слова перетаскивают зажатием
    const desktop = useIsDesktopWeb();

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

    const moveOption = (from: number, to: number) =>
        setDraft((d) => {
            if (to < 0 || to >= d.options.length || to === from) return d;
            const options = [...d.options];
            const [moved] = options.splice(from, 1);
            options.splice(to, 0, moved);
            return { ...d, options };
        });

    const addOption = (inAnswer: boolean) =>
        setDraft((d) => ({ ...d, options: [...d.options, { ...newOption(), inAnswer }] }));

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

    // строка пары в «Сопоставлении»: слово — его пара
    const renderPair = (option: OptionDraft, index: number) => (
        <View key={option.key} style={styles.optionRow}>
            <TextInput
                value={option.text}
                onChangeText={(text) => updateOption(option.key, { text })}
                placeholder={`Слово ${index + 1}`}
                placeholderTextColor={AppColors.textSecondary}
                style={styles.optionInput}
            />
            <Ionicons name="swap-horizontal" size={18} color={AppColors.textSecondary} />
            <TextInput
                value={option.matchText}
                onChangeText={(matchText) => updateOption(option.key, { matchText })}
                placeholder="Пара"
                placeholderTextColor={AppColors.textSecondary}
                style={styles.optionInput}
            />
            <IconButton icon="close" label="Удалить пару" color={AppColors.error} onPress={() => removeOption(option.key)} />
        </View>
    );

    // строка варианта; handle — ручка перетаскивания (только в «Последовательности»)
    const renderOption = (option: OptionDraft, index: number, handle?: ReactNode) => {
        const order = draft.type === 'ORDER';
        return (
            <View key={option.key} style={[styles.optionRow, order && styles.optionRowOrder]}>
                {handle}
                {order ? (
                    <OrderToggle
                        number={orderNumbers[index]}
                        onPress={() => updateOption(option.key, { inAnswer: !option.inAnswer })}
                    />
                ) : (
                    <ChoiceMarker type={draft.type} option={option} onPress={() => toggleCorrect(option.key)} />
                )}
                <TextInput
                    value={option.text}
                    onChangeText={(text) => updateOption(option.key, { text })}
                    placeholder={order ? (option.inAnswer ? 'Слово' : 'Лишнее слово') : `Вариант ${index + 1}`}
                    placeholderTextColor={AppColors.textSecondary}
                    style={styles.optionInput}
                />
                {order && desktop ? (
                    <>
                        <IconButton icon="chevron-up" label="Выше" onPress={() => moveOption(index, index - 1)} disabled={index === 0} />
                        <IconButton
                            icon="chevron-down"
                            label="Ниже"
                            onPress={() => moveOption(index, index + 1)}
                            disabled={index === draft.options.length - 1}
                        />
                    </>
                ) : null}
                <IconButton icon="close" label="Удалить вариант" color={AppColors.error} onPress={() => removeOption(option.key)} />
            </View>
        );
    };

    return (
        <Card style={styles.form}>
            <FormHeader title={isNew ? 'Новый вопрос' : 'Редактирование вопроса'} onClose={onCancel} />

            <MediaField kind="audio" label="Аудио к вопросу (необязательно)" draft={draft.audio} onChange={(audio) => setDraft((d) => ({ ...d, audio }))} />

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

            <Text style={styles.label}>{OPTIONS_LABELS[draft.type]}</Text>
            {draft.type === 'MATCHING' ? draft.options.map(renderPair) : draft.type === 'ORDER' ? (
                <DraggableList
                    items={draft.options}
                    keyOf={(option) => option.key}
                    rowHeight={ORDER_ROW_HEIGHT}
                    onReorder={moveOption}
                    renderItem={(option, index, handle) => renderOption(option, index, handle)}
                />
            ) : draft.options.map((option, index) => renderOption(option, index))}

            {draft.type === 'MATCHING' ? (
                <Button
                    title={draft.options.length >= MAX_MATCHING_PAIRS ? `Максимум ${MAX_MATCHING_PAIRS} пар` : 'Добавить пару'}
                    icon="add"
                    variant="secondary"
                    small
                    disabled={draft.options.length >= MAX_MATCHING_PAIRS}
                    onPress={() => addOption(true)}
                    style={styles.addOption}
                />
            ) : draft.type === 'ORDER' ? (
                <View style={styles.addButtons}>
                    <Button title="Добавить слово" icon="add" variant="secondary" small onPress={() => addOption(true)} />
                    <Button title="Добавить лишнее слово" icon="add" variant="secondary" small onPress={() => addOption(false)} />
                </View>
            ) : (
                <Button
                    title="Добавить вариант"
                    icon="add"
                    variant="secondary"
                    small
                    // inAnswer как у новых вариантов раньше: если тип сменят на «Последовательность», слово войдёт в ответ
                    onPress={() => addOption(true)}
                    style={styles.addOption}
                />
            )}

            <ErrorBanner message={error} />

            <View style={styles.buttons}>
                <Button title="Отмена" variant="ghost" onPress={onCancel} style={styles.flex} />
                <Button title="Сохранить" icon="checkmark" onPress={handleSave} loading={saving} style={styles.flex} />
            </View>
        </Card>
    );
}

// «Последовательность»: входит ли слово в ответ. Номер — его место в правильном ответе, «Лишнее» — не входит
function OrderToggle({ number, onPress }: { number: number | null; onPress: () => void }) {
    const inAnswer = number !== null;
    return (
        <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: inAnswer }}
            accessibilityLabel={inAnswer ? `Входит в ответ, место ${number}` : 'Лишнее слово, в ответ не входит'}
            onPress={onPress}
            hitSlop={4}
            style={({ pressed }) => [styles.orderToggle, inAnswer ? styles.orderToggleIn : styles.orderToggleOut, pressed && styles.pressed]}
        >
            <Ionicons name={inAnswer ? 'checkmark' : 'close'} size={14} color={inAnswer ? '#fff' : AppColors.error} />
            <Text style={[styles.orderToggleText, !inAnswer && styles.orderToggleTextOut]}>{inAnswer ? number : 'Лишнее'}</Text>
        </Pressable>
    );
}

// Отметка правильности слева от варианта: кружок (один ответ) или квадрат (несколько)
function ChoiceMarker({ type, option, onPress }: {
    type: QuestionType;
    option: OptionDraft;
    onPress: () => void;
}) {
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
    // высоту строки задаёт DraggableList (ORDER_ROW_HEIGHT), отступ между строками входит в неё
    optionRowOrder: {
        height: ORDER_ROW_HEIGHT - 8,
        marginBottom: 0,
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
    orderToggle: {
        width: 86,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    orderToggleIn: {
        backgroundColor: AppColors.accent,
        borderColor: AppColors.accent,
    },
    orderToggleOut: {
        backgroundColor: AppColors.errorBackground,
        borderColor: AppColors.errorBackground,
    },
    orderToggleText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
    orderToggleTextOut: {
        color: AppColors.error,
        fontSize: 13,
    },
    pressed: {
        opacity: 0.6,
    },
    addOption: {
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    addButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
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
