import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { EmptyState, ErrorBanner, IconButton, LoadingView, Muted, Page, ScreenHeader, Title } from '@/components/app-ui';
import { lessonNumber, LessonRow } from '@/components/lesson-row';
import { VideoRow } from '@/components/video-row';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';
import type { CourseItem } from '@/lib/types';

// Курс для прохождения: уроки и видео одним списком, нажатие открывает урок или видео
export default function CourseScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const id = Number(courseId);
    const api = useApi();

    const { data, error, loading, reload } = useLoader(async () => {
        const [course, items] = await Promise.all([api.courses.get(id), api.courses.items(id)]);
        return { course, items };
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

                            {data.items.length === 0 ? (
                                <EmptyState icon="book-outline" title="В курсе пока нет уроков" />
                            ) : null}

                            {data.items.map((item) => <CourseItemRow key={`${item.kind}-${item.id}`} item={item} items={data.items} courseId={id} />)}
                        </>
                    ) : null}
                </Page>
            )}
        </View>
    );
}

function CourseItemRow({ item, items, courseId }: { item: CourseItem; items: CourseItem[]; courseId: number }) {
    if (item.kind === 'VIDEO') {
        const watch = item.videoUrl
            ? () => router.push({ pathname: '/video/[videoId]', params: { videoId: item.id, courseId } })
            : undefined;
        return (
            <VideoRow
                video={item}
                onPress={watch}
                actions={watch
                    ? <IconButton icon="play-circle" label="Смотреть видео" color={AppColors.blue} onPress={watch} />
                    : null}
            />
        );
    }

    const play = item.itemCount > 0
        ? () => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: item.id } })
        : undefined;
    return (
        <LessonRow
            lesson={item}
            index={lessonNumber(items, item)}
            onPress={play}
            actions={play
                ? <IconButton icon="play-circle" label="Начать урок" color={AppColors.accent} onPress={play} />
                : null}
        />
    );
}
