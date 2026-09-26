import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import type { LessonSummary } from '@/lib/types';

export function itemsLabel(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} шаг`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} шага`;
    return `${count} шагов`;
}

// Строка урока: номер в кружке, название, число шагов (вопросы + сообщения) и действия справа.
// Нажимается только левая часть: кнопки действий не должны лежать внутри другой кнопки (в вебе это <button> в <button>)
export function LessonRow({ lesson, index, onPress, actions }: {
    lesson: LessonSummary;
    index: number;
    onPress?: () => void;
    actions?: ReactNode;
}) {
    const empty = lesson.itemCount === 0;

    return (
        <Card style={styles.row}>
            <Pressable
                accessibilityRole={onPress ? 'button' : undefined}
                disabled={!onPress}
                onPress={onPress}
                style={({ pressed }) => [styles.main, pressed && styles.pressed]}
            >
                <View style={[styles.number, empty && styles.numberEmpty]}>
                    <Text style={styles.numberText}>{index + 1}</Text>
                </View>

                <View style={styles.body}>
                    <Text style={styles.title} numberOfLines={2}>{lesson.title}</Text>
                    {lesson.description ? (
                        <Text style={styles.description} numberOfLines={2}>{lesson.description}</Text>
                    ) : null}
                    <Text style={styles.meta}>{empty ? 'Пока пустой' : itemsLabel(lesson.itemCount)}</Text>
                </View>
            </Pressable>

            {actions ? <View style={styles.actions}>{actions}</View> : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    main: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    pressed: {
        opacity: 0.7,
    },
    number: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: AppColors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberEmpty: {
        backgroundColor: AppColors.border,
    },
    numberText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 18,
    },
    body: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: AppColors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    description: {
        color: AppColors.textSecondary,
        fontSize: 14,
    },
    meta: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
