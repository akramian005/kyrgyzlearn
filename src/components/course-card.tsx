import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button, Card, IconButton, pressWithBlur } from '@/components/app-ui';
import { markdownToPlain } from '@/components/markdown';
import { AppColors } from '@/constants/app-colors';
import { useIsDesktopWeb } from '@/lib/device';
import type { Course } from '@/lib/types';

// разные цвета значков, чтобы курсы в списке различались
const ICON_COLORS = ['#58CC02', '#1CB0F6', '#FF9600', '#CE82FF', '#FF4B4B', '#FFC800'];

// onOpenCourse — справа отдельная кнопка «Перейти к курсу» (в конструкторе: карточка открывает редактор,
// а эта кнопка — сам курс, чтобы его пройти)
export function CourseCard({ course, onPress, actionIcon = 'chevron-forward', showAuthor = false, onOpenCourse }: {
    course: Course;
    onPress: () => void;
    actionIcon?: 'chevron-forward' | 'create-outline';
    showAuthor?: boolean;
    onOpenCourse?: () => void;
}) {
    const color = courseColor(course);
    const progress = courseProgressBadge(course);
    // ширина значка прогресса: строку с уроками обрезаем раньше, чтобы не залезала под него
    const [badgeWidth, setBadgeWidth] = useState(0);

    const content = (
        <>
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
        </>
    );

    // прогресс — внизу, на уровне строки с уроками, левее стрелки (и кнопки перехода, если она есть);
    // поверх карточки, поэтому остальное не сдвигается
    const badge = progress ? (
        <View
            style={[styles.badge, onOpenCourse ? { right: BADGE_RIGHT + OPEN_BUTTON_WIDTH } : null]}
            onLayout={(e) => setBadgeWidth(e.nativeEvent.layout.width)}
        >
            {progress.done ? <Ionicons name="checkmark-circle" size={14} color={AppColors.gold} /> : null}
            <Text style={styles.badgeText}>{progress.text}</Text>
        </View>
    ) : null;

    if (!onOpenCourse) {
        return (
            <Card onPress={onPress} style={styles.card}>
                {content}
                {badge}
            </Card>
        );
    }

    // с кнопкой перехода нажимается только левая часть: кнопка не должна лежать внутри другой кнопки
    return (
        <Card style={styles.card}>
            <Pressable accessibilityRole="button" onPress={pressWithBlur(onPress)} style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}>
                {content}
            </Pressable>
            <IconButton icon="play-circle" label="Перейти к курсу" color={AppColors.accent} onPress={onOpenCourse} />
            {badge}
        </Card>
    );
}

// Карточка курса на главной: примерно 2 к 1. Слева название, описание, уроки и видео, прогресс
// и кнопка во всю ширину колонки; справа большая картинка 4:3
export function HomeCourseCard({ course, onPress }: { course: Course; onPress: () => void }) {
    const progressLabel = courseProgressLabel(course);
    const done = course.totalItemCount > 0 && course.completedItemCount >= course.totalItemCount;
    const action = done ? 'Повторить' : progressLabel ? 'Продолжить' : 'Начать';
    // на ПК карточка широкая (до 760px) — текст и кнопку делаем крупнее
    const pc = useIsDesktopWeb();

    return (
        // рамка: пройден — зелёная, начат, но не закончен — жёлтая, не начат — обычная
        <Card onPress={onPress} style={[styles.homeCard, done ? styles.homeCardDone : progressLabel ? styles.homeCardStarted : null]}>
            <View style={styles.homeBody}>
                <View style={styles.homeText}>
                    <Text style={[styles.title, pc && styles.pcTitle]} numberOfLines={2}>{course.title}</Text>
                    {course.description ? (
                        <Text style={[styles.homeDescription, pc && styles.pcDescription]} numberOfLines={2}>{markdownToPlain(course.description)}</Text>
                    ) : null}
                    <Text style={[styles.meta, pc && styles.pcMeta]} numberOfLines={1}>
                        {lessonsLabel(course.lessonCount)}
                        {course.videoCount > 0 ? ` · ${course.videoCount} видео` : ''}
                    </Text>
                </View>
                {/* статус — внизу, прямо над кнопкой; пройденный курс — зелёным, как и рамка */}
                <View style={styles.homeFooter}>
                    <View style={styles.homeStatus}>
                        {done ? <Ionicons name="checkmark-circle" size={pc ? 20 : 16} color={AppColors.accent} /> : null}
                        <Text
                            style={[progressLabel ? [styles.badgeText, done && styles.homeStatusDone] : styles.meta, pc && styles.pcStatus]}
                            numberOfLines={1}
                        >
                            {progressLabel ?? 'Ещё не начат'}
                        </Text>
                    </View>
                    {/* нажатие — на всю карточку; сама кнопка только для вида, иначе в вебе <button> внутри <button> */}
                    <Button title={action} small={!pc} decorative variant={done ? 'secondary' : 'primary'} style={styles.homeButton} />
                </View>
            </View>
            <CourseCover course={course} style={styles.homeCover} />
        </Card>
    );
}

// Картинка курса; нет картинки — первая буква названия на цветном фоне. Размер задаёт style
export function CourseCover({ course, style }: { course: Course; style: StyleProp<ViewStyle> }) {
    if (course.imageUrl) {
        return (
            <View style={[styles.coverFrame, style]}>
                <Image source={{ uri: course.imageUrl }} style={[styles.image, styles.coverImage]} contentFit="cover" />
            </View>
        );
    }
    return (
        <View style={[styles.cover, { backgroundColor: courseColor(course) }, style]}>
            <Text style={styles.coverText}>{course.title.trim().charAt(0).toUpperCase() || '?'}</Text>
        </View>
    );
}

// у официальных курсов id отрицательные — берём по модулю
function courseColor(course: Course): string {
    return ICON_COLORS[Math.abs(course.id) % ICON_COLORS.length];
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
// кнопка «Перейти к курсу» справа: IconButton (22 + 8 * 2) и gap карточки 14
const OPEN_BUTTON_WIDTH = 22 + 8 * 2 + 14;
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
    cardMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    cardPressed: {
        opacity: 0.7,
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
    homeCard: {
        flexDirection: 'row',
        gap: 14,
        // снизу чуть меньше обычного отступа карточки — блок на ~3% ниже
        paddingBottom: 11,
    },
    homeCardDone: {
        borderColor: AppColors.accent,
    },
    homeCardStarted: {
        borderColor: AppColors.gold,
    },
    // колонка текста растягивается на высоту картинки, кнопка прижата к низу
    homeBody: {
        flex: 1,
        justifyContent: 'space-between',
        gap: 10,
    },
    homeText: {
        gap: 4,
    },
    homeDescription: {
        color: AppColors.textSecondary,
        fontSize: 14,
        lineHeight: 19,
    },
    homeStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    homeStatusDone: {
        color: AppColors.accent,
    },
    homeFooter: {
        gap: 6,
    },
    // кнопка «Начать / Продолжить / Повторить» — скруглённая «таблеткой»
    homeButton: {
        borderRadius: 999,
    },
    // крупный текст карточки на главной в веб-версии для ПК
    pcTitle: {
        fontSize: 24,
        lineHeight: 30,
    },
    pcDescription: {
        fontSize: 17,
        lineHeight: 24,
    },
    pcMeta: {
        fontSize: 16,
        lineHeight: 22,
    },
    pcStatus: {
        fontSize: 16,
        lineHeight: 22,
        marginTop: 0,
    },
    // горизонтальная картинка 4:3 почти на половину ширины, по центру высоты карточки
    homeCover: {
        width: '46%',
        aspectRatio: 4 / 3,
        alignSelf: 'center',
        borderRadius: 14,
    },
    // картинка заполняет рамку, а размер и скругление задаёт style рамки
    coverFrame: {
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    cover: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverText: {
        color: '#fff',
        fontSize: 48,
        fontWeight: '800',
    },
});
