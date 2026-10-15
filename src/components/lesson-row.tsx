import Ionicons from '@expo/vector-icons/Ionicons';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, pressWithBlur } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import type { CourseItem, LessonSummary } from '@/lib/types';

export function itemsLabel(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} шаг`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} шага`;
    return `${count} шагов`;
}

// номер урока в курсе считается только по урокам: видео между ними нумерацию не сбивают
export function lessonNumber(items: CourseItem[], lesson: LessonSummary): number {
    return items.filter((item) => item.kind === 'LESSON').indexOf(lesson);
}

// Строка урока: номер в кружке, «Урок N», число шагов (вопросы + сообщения) и действия справа.
// showProgress — при прохождении курса у пройденного урока вместо номера золотая галочка
// (в редакторе курса не нужен: там важнее номер).
// Нажимается только левая часть: кнопки действий не должны лежать внутри другой кнопки (в вебе это <button> в <button>)
export function LessonRow({ lesson, index, onPress, actions, showProgress = false }: {
    lesson: LessonSummary;
    index: number;
    onPress?: () => void;
    actions?: ReactNode;
    showProgress?: boolean;
}) {
    const empty = lesson.itemCount === 0;
    const completed = showProgress && lesson.completed;

    return (
        <Card style={styles.row}>
            <Pressable
                accessibilityRole={onPress ? 'button' : undefined}
                disabled={!onPress}
                onPress={pressWithBlur(onPress)}
                style={({ pressed }) => [styles.main, pressed && styles.pressed]}
            >
                <View style={[styles.number, empty && styles.numberEmpty, completed && styles.numberCompleted]}>
                    {completed
                        ? <Ionicons name="checkmark" size={26} color="#fff" />
                        : <Text style={styles.numberText}>{index + 1}</Text>}
                </View>

                <View style={styles.body}>
                    {/* у урока нет своего названия — он «Урок N» в своём юните */}
                    <Text style={styles.title} numberOfLines={1}>Урок {index + 1}</Text>
                    <Text style={styles.meta}>
                        {completed ? <Text style={styles.completed}>Пройден · </Text> : null}
                        {empty ? 'Пока пустой' : itemsLabel(lesson.itemCount)}
                    </Text>
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
    numberCompleted: {
        backgroundColor: AppColors.gold,
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
    meta: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    completed: {
        color: AppColors.gold,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
