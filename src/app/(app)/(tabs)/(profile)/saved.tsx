import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View, type ScrollView } from 'react-native';

import { EmptyState, ErrorBanner, LoadingView, OfflineState, Page, ScreenHeader } from '@/components/app-ui';
import { CourseCard } from '@/components/course-card';
import { Pagination } from '@/components/pagination';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';

// столько же, сколько в «Поиске»
const PAGE_SIZE = 20;

// «Сохранённые курсы» из профиля — по страницам с номерами, как в «Поиске».
// Бэкенд отдаёт весь список сразу (сохранённых обычно немного), страницы режем здесь.
export default function SavedCoursesScreen() {
    const api = useApi();
    // тот же ключ кэша, что и в профиле: открывается сразу, без загрузки
    const { data: courses, error, loading, offline, reload } = useLoader(() => api.saved.list(), 'saved');
    const [page, setPage] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    const pageCount = Math.ceil((courses?.length ?? 0) / PAGE_SIZE);
    // курс могли убрать из сохранённых — страница могла опустеть, тогда показываем последнюю
    const currentPage = Math.min(page, Math.max(pageCount - 1, 0));
    const visible = (courses ?? []).slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    const changePage = (pageNumber: number) => {
        setPage(pageNumber);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    };

    return (
        <View style={{ flex: 1, backgroundColor: AppColors.background }}>
            <ScreenHeader title="Сохранённые курсы" />

            {loading && !courses ? <LoadingView /> : (
                <Page ref={scrollRef} onRefresh={reload}>
                    <ErrorBanner message={error} />
                    {offline && !courses ? <OfflineState onRetry={() => void reload()} /> : null}

                    {courses && courses.length === 0 ? (
                        <EmptyState
                            icon="bookmark-outline"
                            title="Пока ничего не сохранено"
                            text="Найдите курс во вкладке «Поиск» и нажмите «Сохранить курс»"
                        />
                    ) : null}

                    {visible.map((course) => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            showAuthor
                            onPress={() => router.push({ pathname: '/course/[courseId]', params: { courseId: course.id } })}
                        />
                    ))}

                    <Pagination page={currentPage} pageCount={pageCount} onChange={changePage} />
                </Page>
            )}
        </View>
    );
}
