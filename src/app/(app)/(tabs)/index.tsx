import { router } from 'expo-router';
import React from 'react';

import { CourseCard } from '@/components/course-card';
import { EmptyState, ErrorBanner, LoadingView, Muted, OfflineState, Page, Title } from '@/components/app-ui';
import { useApi, useLoader } from '@/lib/hooks';

// Главная: официальные курсы, созданные админом, — их проходят все пользователи
export default function HomeScreen() {
    const api = useApi();
    const { data: courses, error, loading, offline, reload } = useLoader(() => api.courses.list(), 'courses');

    // бэкенд отдаёт ещё и собственные курсы пользователя — они живут во вкладке «Прочее»
    const official = (courses ?? []).filter((course) => course.type === 'OFFICIAL');

    if (loading && !courses) return <LoadingView />;

    return (
        <Page onRefresh={reload}>
            <Title>Курсы</Title>
            <Muted style={{ marginTop: -10, marginBottom: 16 }}>Выберите курс и начните урок</Muted>

            <ErrorBanner message={error} />
            {offline && !courses ? <OfflineState onRetry={() => void reload()} /> : null}

            {courses && official.length === 0 ? (
                <EmptyState icon="school-outline" title="Курсов пока нет" text="Скоро здесь появятся курсы кыргызского языка" />
            ) : null}

            {official.map((course) => (
                <CourseCard
                    key={course.id}
                    course={course}
                    onPress={() => router.push({ pathname: '/course/[courseId]', params: { courseId: course.id } })}
                />
            ))}
        </Page>
    );
}
