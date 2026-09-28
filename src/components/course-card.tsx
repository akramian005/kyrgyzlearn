import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import type { Course } from '@/lib/types';

// разные цвета значков, чтобы курсы в списке различались
const ICON_COLORS = ['#58CC02', '#1CB0F6', '#FF9600', '#CE82FF', '#FF4B4B', '#FFC800'];

export function CourseCard({ course, onPress, actionIcon = 'chevron-forward', showAuthor = false }: {
    course: Course;
    onPress: () => void;
    actionIcon?: 'chevron-forward' | 'create-outline';
    showAuthor?: boolean;
}) {
    // у официальных курсов id отрицательные — берём по модулю
    const color = ICON_COLORS[Math.abs(course.id) % ICON_COLORS.length];

    return (
        <Card onPress={onPress} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: color }]}>
                <Text style={styles.iconText}>{course.title.trim().charAt(0).toUpperCase() || '?'}</Text>
            </View>

            <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
                {showAuthor ? (
                    <Text style={styles.author} numberOfLines={1}>{courseAuthor(course)}</Text>
                ) : null}
                {course.description ? (
                    <Text style={styles.description} numberOfLines={2}>{course.description}</Text>
                ) : null}
                <Text style={styles.meta}>
                    {lessonsLabel(course.lessonCount)}
                    {course.videoCount > 0 ? ` · ${course.videoCount} видео` : ''}
                </Text>
            </View>

            <Ionicons name={actionIcon} size={22} color={AppColors.textSecondary} />
        </Card>
    );
}

// создатель курса; если имени нет — показываем id пользователя
export function courseAuthor(course: Course): string {
    if (course.type === 'OFFICIAL') return 'Официальный курс KyrgyzLearn';
    return `Автор: ${course.ownerName?.trim() || `пользователь #${course.ownerId}`}`;
}

export function lessonsLabel(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} урок`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} урока`;
    return `${count} уроков`;
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    icon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
    },
    body: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: AppColors.text,
        fontSize: 17,
        fontWeight: '800',
    },
    author: {
        color: AppColors.blue,
        fontSize: 13,
        fontWeight: '700',
    },
    description: {
        color: AppColors.textSecondary,
        fontSize: 14,
    },
    meta: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
});
