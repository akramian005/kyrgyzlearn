import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/app-ui';
import { markdownToPlain } from '@/components/markdown';
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
    const progress = courseProgressBadge(course);
    // ширина значка прогресса: строку с уроками обрезаем раньше, чтобы не залезала под него
    const [badgeWidth, setBadgeWidth] = useState(0);

    return (
        <Card onPress={onPress} style={styles.card}>
            {/* картинка курса того же размера, что и значок с буквой; нет картинки — буква на цветном фоне */}
            {course.imageUrl ? (
                <Image source={{ uri: course.imageUrl }} style={[styles.icon, styles.image]} contentFit="cover" />
            ) : (
                <View style={[styles.icon, { backgroundColor: color }]}>
                    <Text style={styles.iconText}>{course.title.trim().charAt(0).toUpperCase() || '?'}</Text>
                </View>
            )}

            {/* у всех карточек одна высота: название, описание (место под строку есть, даже если описания нет)
                и строка с автором, уроками и прогрессом — каждое в одну строку */}
            <View style={styles.body}>
                <Text style={styles.title} numberOfLines={1}>
                    {course.title}
                </Text>
                <Text style={styles.description} numberOfLines={1}>
                    {course.description ? markdownToPlain(course.description) : ''}
                </Text>
                <Text style={[styles.meta, progress ? { paddingRight: Math.max(0, badgeWidth - BADGE_OVER_CHEVRON) } : null]} numberOfLines={1}>
                    {showAuthor ? <Text style={styles.author}>{courseAuthorShort(course)} · </Text> : null}
                    {lessonsLabel(course.lessonCount)}
                    {course.videoCount > 0 ? ` · ${course.videoCount} видео` : ''}
                </Text>
            </View>

            <Ionicons name={actionIcon} size={22} color={AppColors.textSecondary} />

            {/* прогресс — внизу, на уровне строки с уроками, левее стрелки; поверх карточки, поэтому остальное не сдвигается */}
            {progress ? (
                <View style={styles.badge} onLayout={(e) => setBadgeWidth(e.nativeEvent.layout.width)}>
                    {progress.done ? <Ionicons name="checkmark-circle" size={14} color={AppColors.gold} /> : null}
                    <Text style={styles.badgeText}>{progress.text}</Text>
                </View>
            ) : null}
        </Card>
    );
}

// создатель курса; если имени нет — показываем id пользователя
export function courseAuthor(course: Course): string {
    if (course.type === 'OFFICIAL') return 'Официальный курс KyrgyzLearn';
    return `Автор: ${course.ownerName?.trim() || `пользователь #${course.ownerId}`}`;
}

// для строки карточки — без слова «Автор:», чтобы влезало в одну строку
function courseAuthorShort(course: Course): string {
    if (course.type === 'OFFICIAL') return 'KyrgyzLearn';
    return course.ownerName?.trim() || `пользователь #${course.ownerId}`;
}

// значок стоит левее стрелки: отступ от правого края карточки
const BADGE_RIGHT = 36;
// часть значка, которая приходится на стрелку и отступ до текста (padding 16 + стрелка 22 + gap 14);
// остальное — над строкой с уроками, минус 6px зазора между ней и значком
const BADGE_OVER_CHEVRON = 16 + 22 + 14 - BADGE_RIGHT - 6;

// коротко для значка на карточке: «Пройден» / «2 из 5»; null — к курсу ещё не приступали
function courseProgressBadge(course: Course): { text: string; done: boolean } | null {
    if (course.completedItemCount === 0 || course.totalItemCount === 0) return null;
    if (course.completedItemCount >= course.totalItemCount) return { text: 'Пройден', done: true };
    return { text: `${course.completedItemCount} из ${course.totalItemCount}`, done: false };
}

// «Курс пройден» / «Пройдено 2 из 5» (уроки и видео вместе); null — к курсу ещё не приступали
export function courseProgressLabel(course: Course): string | null {
    if (course.completedItemCount === 0 || course.totalItemCount === 0) return null;
    if (course.completedItemCount >= course.totalItemCount) return 'Курс пройден';
    return `Пройдено ${course.completedItemCount} из ${course.totalItemCount}`;
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
    image: {
        backgroundColor: AppColors.surfaceRaised,
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
        lineHeight: 22,
        fontWeight: '800',
    },
    author: {
        color: AppColors.blue,
        fontWeight: '700',
    },
    description: {
        color: AppColors.textSecondary,
        fontSize: 14,
        lineHeight: 19,
        // ровно одна строка независимо от длины текста
        height: 19,
    },
    meta: {
        color: AppColors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        marginTop: 2,
    },
    badge: {
        position: 'absolute',
        // по центру нижней строки (с уроками): padding 16 + (18 - 16) / 2
        bottom: 17,
        right: BADGE_RIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    badgeText: {
        color: AppColors.gold,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '800',
    },
});
