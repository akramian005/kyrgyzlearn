import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/audio-button';
import { AppColors } from '@/constants/app-colors';
import { shuffle } from '@/lib/answers';
import type { AnswerOption, Question } from '@/lib/types';

const INSTRUCTIONS = {
    SINGLE_CHOICE: 'Выберите правильный ответ',
    MULTIPLE_CHOICE: 'Выберите все правильные ответы',
    ORDER: 'Соберите ответ в правильном порядке',
} as const;

// Шаг-вопрос. Выбор хранится у родителя (selected), чтобы он мог проверить ответ.
// checked — ответ уже проверен: подсвечиваем правильные/неправильные варианты и блокируем выбор.
export function QuestionStep({ question, selected, onChange, checked }: {
    question: Question;
    selected: number[];
    onChange: (selected: number[]) => void;
    checked: boolean;
}) {
    // перемешиваем один раз на показ вопроса — иначе в ORDER порядок вариантов выдал бы ответ
    const [options] = useState(() => shuffle(question.options));

    return (
        <View>
            <Text style={styles.instruction}>{INSTRUCTIONS[question.type]}</Text>

            <View style={styles.promptRow}>
                {question.audioUrl ? <AudioButton key={question.audioUrl} url={question.audioUrl} large /> : null}
                <Text style={styles.prompt}>{question.text}</Text>
            </View>

            {question.type === 'ORDER' ? (
                <OrderAnswer options={options} selected={selected} onChange={onChange} disabled={checked} />
            ) : (
                <ChoiceList
                    options={options}
                    multiple={question.type === 'MULTIPLE_CHOICE'}
                    selected={selected}
                    onChange={onChange}
                    checked={checked}
                />
            )}
        </View>
    );
}

function ChoiceList({ options, multiple, selected, onChange, checked }: {
    options: AnswerOption[];
    multiple: boolean;
    selected: number[];
    onChange: (selected: number[]) => void;
    checked: boolean;
}) {
    const toggle = (id: number) => {
        if (!multiple) {
            onChange([id]);
            return;
        }
        onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    };

    return (
        <View style={styles.choices}>
            {options.map((option) => {
                const isSelected = selected.includes(option.id);

                // после проверки: выбранный правильный — зелёный, выбранный неправильный — красный,
                // пропущенный правильный — зелёная рамка
                let variant: 'idle' | 'selected' | 'right' | 'wrong' | 'missed' = isSelected ? 'selected' : 'idle';
                if (checked) {
                    if (isSelected) variant = option.correct ? 'right' : 'wrong';
                    else if (option.correct) variant = 'missed';
                }

                return (
                    <Pressable
                        key={option.id}
                        accessibilityRole={multiple ? 'checkbox' : 'radio'}
                        accessibilityState={multiple ? { checked: isSelected } : { selected: isSelected }}
                        disabled={checked}
                        onPress={() => toggle(option.id)}
                        style={({ pressed }) => [styles.choice, choiceStyles[variant], pressed && styles.choicePressed]}
                    >
                        <View style={[styles.choiceMarker, !multiple && styles.choiceMarkerRound, isSelected && markerStyles[variant]]} />
                        <Text style={[styles.choiceText, textStyles[variant]]}>{option.text}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ORDER: сверху строка ответа, снизу «банк» вариантов. Нажатие переносит вариант туда и обратно
function OrderAnswer({ options, selected, onChange, disabled }: {
    options: AnswerOption[];
    selected: number[];
    onChange: (selected: number[]) => void;
    disabled: boolean;
}) {
    const byId = new Map(options.map((option) => [option.id, option]));

    return (
        <View>
            <View style={styles.answerArea}>
                {selected.length === 0 ? <Text style={styles.answerPlaceholder}>Нажимайте на варианты ниже</Text> : null}
                {selected.map((id) => (
                    <Chip key={id} text={byId.get(id)?.text ?? ''} disabled={disabled} onPress={() => onChange(selected.filter((s) => s !== id))} />
                ))}
            </View>

            <View style={styles.bank}>
                {options.map((option) => {
                    const used = selected.includes(option.id);
                    // использованный вариант оставляет пустое место, чтобы банк не прыгал
                    return used
                        ? <View key={option.id} style={[styles.chip, styles.chipUsed]}><Text style={[styles.chipText, styles.chipTextUsed]}>{option.text}</Text></View>
                        : <Chip key={option.id} text={option.text} disabled={disabled} onPress={() => onChange([...selected, option.id])} />;
                })}
            </View>
        </View>
    );
}

function Chip({ text, onPress, disabled }: { text: string; onPress: () => void; disabled: boolean }) {
    return (
        <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
            <Text style={styles.chipText}>{text}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    instruction: {
        color: AppColors.textSecondary,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
    },
    promptRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 24,
    },
    prompt: {
        flex: 1,
        color: AppColors.text,
        fontSize: 22,
        fontWeight: '700',
    },
    choices: {
        gap: 12,
    },
    choice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderRadius: 14,
        padding: 16,
    },
    choicePressed: {
        opacity: 0.8,
    },
    choiceMarker: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: AppColors.border,
    },
    choiceMarkerRound: {
        borderRadius: 11,
    },
    choiceText: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
    },
    answerArea: {
        minHeight: 64,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 2,
        borderTopWidth: 2,
        borderColor: AppColors.border,
        paddingVertical: 10,
        marginBottom: 24,
    },
    answerPlaceholder: {
        color: AppColors.textSecondary,
        fontSize: 15,
    },
    bank: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    chip: {
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: AppColors.border,
        backgroundColor: AppColors.surface,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    chipPressed: {
        opacity: 0.7,
    },
    chipUsed: {
        backgroundColor: AppColors.border,
        borderBottomWidth: 2,
        marginTop: 2,
    },
    chipText: {
        color: AppColors.text,
        fontSize: 17,
        fontWeight: '600',
    },
    chipTextUsed: {
        color: 'transparent',
    },
});

const choiceStyles = StyleSheet.create({
    idle: { backgroundColor: AppColors.surface, borderColor: AppColors.border },
    selected: { backgroundColor: AppColors.blueBackground, borderColor: AppColors.blue },
    right: { backgroundColor: AppColors.accentBackground, borderColor: AppColors.accent },
    wrong: { backgroundColor: AppColors.errorBackground, borderColor: AppColors.errorStrong },
    missed: { backgroundColor: AppColors.surface, borderColor: AppColors.accent },
});

const markerStyles = StyleSheet.create({
    idle: {},
    selected: { backgroundColor: AppColors.blue, borderColor: AppColors.blue },
    right: { backgroundColor: AppColors.accent, borderColor: AppColors.accent },
    wrong: { backgroundColor: AppColors.errorStrong, borderColor: AppColors.errorStrong },
    missed: {},
});

const textStyles = StyleSheet.create({
    idle: { color: AppColors.text },
    selected: { color: AppColors.blue },
    right: { color: AppColors.success },
    wrong: { color: AppColors.error },
    missed: { color: AppColors.text },
});
