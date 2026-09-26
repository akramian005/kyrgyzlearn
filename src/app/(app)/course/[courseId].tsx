import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { EmptyState, ErrorBanner, IconButton, LoadingView, Muted, Page, ScreenHeader, Title } from '@/components/app-ui';
import { LessonRow } from '@/components/lesson-row';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';

// Курс для прохождения: список уроков, нажатие открывает урок
export default function CourseScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const id = Number(courseId);
    const api = useApi();

    const { data, error, loading, reload } = useLoader(async () => {
        const [course, lessons] = await Promise.all([api.courses.get(id), api.lessons.listByCourse(id)]);
        return { course, lessons };
    });

    return (
        <View style={{ flex: 1, backgroundColor: AppColors.background }}>
            <ScreenHeader title={data?.course.title ?? 'Курс'} />

            {loading && !data ? <LoadingView /> : (
                <Page onRefresh={reload}>
                    <ErrorBanner message={error} />

                    {data ? (
                        <>
                            <Title>{data.course.title}</Title>
                            {data.course.description ? (
                                <Muted style={{ marginTop: -8, marginBottom: 20 }}>{data.course.description}</Muted>
                            ) : null}

                            {data.lessons.length === 0 ? (
                                <EmptyState icon="book-outline" title="В курсе пока нет уроков" />
                            ) : null}

                            {data.lessons.map((lesson, index) => {
                                const play = lesson.itemCount > 0
                                    ? () => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } })
                                    : undefined;
                                return (
                                    <LessonRow
                                        key={lesson.id}
                                        lesson={lesson}
                                        index={index}
                                        onPress={play}
                                        actions={play
                                            ? <IconButton icon="play-circle" label="Начать урок" color={AppColors.accent} onPress={play} />
                                            : null}
                                    />
                                );
                            })}
                        </>
                    ) : null}
                </Page>
            )}
        </View>
    );
}
