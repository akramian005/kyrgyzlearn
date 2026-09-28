import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, ErrorBanner, IconButton, LoadingView, Muted, Page, ScreenHeader, Title } from '@/components/app-ui';
import { courseAuthor, courseProgressLabel } from '@/components/course-card';
import { lessonNumber, LessonRow } from '@/components/lesson-row';
import { DESCRIPTION_TEXT_STYLE, Markdown } from '@/components/markdown';
import { VideoRow } from '@/components/video-row';
import { AppColors } from '@/constants/app-colors';
import { errorMessage, useApi, useLoader } from '@/lib/hooks';
import type { Course, CourseItem } from '@/lib/types';

// Курс для прохождения: уроки и видео одним списком, нажатие открывает урок или видео.
// Личный курс (открытый из поиска) можно сохранить — он появится в «Профиле».
export default function CourseScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const id = Number(courseId);
    const api = useApi();

    const { data, error, loading, reload, setData } = useLoader(async () => {
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
                            <Muted style={{ marginTop: -8, marginBottom: 8 }}>{courseAuthor(data.course)}</Muted>
                            {courseProgressLabel(data.course) ? (
                                <Muted style={{ marginBottom: 8, color: AppColors.gold, fontWeight: '700' }}>
                                    {courseProgressLabel(data.course)}
                                </Muted>
                            ) : null}
                            {data.course.description ? (
                                <View style={{ marginBottom: 12 }}>
                                    <Markdown text={data.course.description} style={DESCRIPTION_TEXT_STYLE} />
                                </View>
                            ) : null}

                            {data.course.type === 'USER' ? (
                                <SaveButton
                                    course={data.course}
                                    onChange={(course) => setData({ ...data, course })}
                                />
                            ) : null}
                            <View style={{ height: 12 }} />

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

function CourseItemRow({ item, items, courseId }: { item: CourseItem; items: CourseItem[]; courseId: number }) {
    if (item.kind === 'VIDEO') {
        const watch = item.videoUrl
            ? () => router.push({ pathname: '/video/[videoId]', params: { videoId: item.id, courseId } })
            : undefined;
        return (
            <VideoRow
                video={item}
                showProgress
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
            showProgress
            onPress={play}
            actions={play
                ? <IconButton icon="play-circle" label="Начать урок" color={AppColors.accent} onPress={play} />
                : null}
        />
    );
}
