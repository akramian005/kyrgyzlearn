import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorBanner, LoadingView, OfflineState, Page, pressWithBlur, ScreenHeader } from '@/components/app-ui';
import { markdownToPlain } from '@/components/markdown';
import { UnitPath } from '@/components/unit-path';
import { UnitPopover } from '@/components/unit-sheet';
import { AppColors } from '@/constants/app-colors';
import { errorMessage, useApi, useLoader } from '@/lib/hooks';
import type { Course } from '@/lib/types';

// Курс для прохождения: сверху блок с названием и началом описания (кнопка с тетрадкой открывает
// «О курсе» — картинку и полное описание), ниже юниты «змейкой» кружков.
// Нажатие на кружок открывает окно юнита: выбор урока или видео и «Старт».
// Личный курс (открытый из поиска) можно сохранить — он появится в «Профиле».
export default function CourseScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const id = Number(courseId);
    const api = useApi();

    const { data, error, loading, offline, reload, setData } = useLoader(async () => {
        const [course, units] = await Promise.all([api.courses.get(id), api.courses.units(id)]);
        return { course, units };
    }, `course-units-${id}`);

    // открытый юнит — по id, чтобы после возврата из урока окно показало свежий прогресс
    const [openUnitId, setOpenUnitId] = useState<number | null>(null);

    return (
        <View style={{ flex: 1, backgroundColor: AppColors.background }}>
            <ScreenHeader title={data?.course.title ?? 'Курс'} />

            {loading && !data ? <LoadingView /> : (
                <Page onRefresh={reload}>
                    <ErrorBanner message={error} />
                    {offline && !data ? <OfflineState onRetry={() => void reload()} /> : null}

                    {data ? (
                        <>
                            <Card style={styles.intro}>
                                <View style={styles.introText}>
                                    <Text style={styles.introTitle}>{data.course.title}</Text>
                                    {data.course.description ? (
                                        <Text style={styles.introDescription} numberOfLines={2}>
                                            {markdownToPlain(data.course.description)}
                                        </Text>
                                    ) : null}
                                </View>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="О курсе"
                                    hitSlop={6}
                                    onPress={pressWithBlur(() => router.push({ pathname: '/course-info/[courseId]', params: { courseId: id } }))}
                                    style={({ pressed }) => [styles.infoButton, pressed && styles.pressed]}
                                >
                                    <Ionicons name="journal-outline" size={24} color="#fff" />
                                </Pressable>
                            </Card>

                            {data.course.type === 'USER' ? (
                                <SaveButton
                                    course={data.course}
                                    onChange={(course) => setData({ ...data, course })}
                                />
                            ) : null}
                            <View style={{ height: 12 }} />

                            {data.units.every((unit) => unit.items.length === 0) ? (
                                <EmptyState icon="book-outline" title="В курсе пока нет уроков" />
                            ) : (
                                <UnitPath
                                    units={data.units}
                                    openUnitId={openUnitId}
                                    // повторное нажатие на тот же кружок закрывает окно
                                    onPress={(unit) => setOpenUnitId(unit.id === openUnitId ? null : unit.id)}
                                    renderPopover={(unit, number) => (
                                        <UnitPopover unit={unit} number={number} courseId={id} onClose={() => setOpenUnitId(null)} />
                                    )}
                                />
                            )}
                        </>
                    ) : null}
                </Page>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // блок с названием и началом описания — голубой
    intro: {
        backgroundColor: AppColors.blueBackground,
        borderColor: AppColors.blue,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    introText: {
        flex: 1,
        gap: 4,
    },
    introTitle: {
        color: AppColors.text,
        fontSize: 20,
        fontWeight: '800',
    },
    introDescription: {
        color: AppColors.textSecondary,
        fontSize: 14,
        lineHeight: 19,
    },
    infoButton: {
        width: 48,
        height: 48,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: AppColors.blue,
        // на голубом блоке кнопка залита голубым, чтобы не сливалась с фоном
        backgroundColor: AppColors.blue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.6,
    },
});

function SaveButton({ course, onChange }: { course: Course; onChange: (course: Course) => void }) {
    const api = useApi();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggle = async () => {
        setBusy(true);
        setError(null);
        try {
            if (course.saved) {
                await api.saved.remove(course.id);
            } else {
                await api.saved.add(course.id);
            }
            onChange({ ...course, saved: !course.saved });
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <ErrorBanner message={error} />
            <Button
                title={course.saved ? 'Убрать из сохранённых' : 'Сохранить курс'}
                icon={course.saved ? 'bookmark' : 'bookmark-outline'}
                variant={course.saved ? 'secondary' : 'primary'}
                small
                loading={busy}
                onPress={toggle}
                style={{ alignSelf: 'flex-start' }}
            />
        </>
    );
}
