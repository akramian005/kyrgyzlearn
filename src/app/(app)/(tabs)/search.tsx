import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button, EmptyState, ErrorBanner, LoadingView, Muted, Page, TextField, Title } from '@/components/app-ui';
import { CourseCard } from '@/components/course-card';
import { errorMessage, useApi } from '@/lib/hooks';
import type { Course } from '@/lib/types';

const PAGE_SIZE = 20;
// ждём, пока пользователь допечатает, чтобы не слать запрос на каждую букву
const SEARCH_DELAY_MS = 350;

// «Поиск»: личные курсы всех пользователей с поиском по названию, постранично.
// Курс можно открыть, пройти и сохранить — сохранённые лежат в «Профиле».
export default function SearchScreen() {
    const api = useApi();
    const [query, setQuery] = useState('');
    const [courses, setCourses] = useState<Course[] | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // номер последнего запроса: ответ на устаревший запрос (старый текст поиска) игнорируем
    const requestId = useRef(0);

    const load = useCallback(async (text: string, pageNumber: number) => {
        const id = ++requestId.current;
        try {
            const result = await api.courses.search(text.trim(), pageNumber, PAGE_SIZE);
            if (id !== requestId.current) return;
            setCourses((prev) => (pageNumber === 0 || !prev ? result.content : [...prev, ...result.content]));
            setTotal(result.totalElements);
            setPage(pageNumber);
            setError(null);
        } catch (e) {
            if (id === requestId.current) setError(errorMessage(e));
        }
    }, [api]);

    // новый текст поиска — снова с первой страницы
    useEffect(() => {
        const timer = setTimeout(() => void load(query, 0), SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [query, load]);

    const loadMore = async () => {
        setLoadingMore(true);
        await load(query, page + 1);
        setLoadingMore(false);
    };

    const hasMore = courses !== null && courses.length < total;

    return (
        <Page onRefresh={() => void load(query, 0)}>
            <Title>Поиск</Title>
            <Muted style={{ marginTop: -10, marginBottom: 16 }}>Курсы, которые создали пользователи</Muted>

            <TextField
                label="Название курса"
                value={query}
                onChangeText={setQuery}
                placeholder="Например: глаголы"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
            />

            <ErrorBanner message={error} />

            {courses === null && !error ? <LoadingView /> : null}

            {courses && courses.length === 0 ? (
                query.trim()
                    ? <EmptyState icon="search-outline" title="Ничего не нашлось" text="Попробуйте другое название" />
                    : <EmptyState icon="people-outline" title="Курсов пока нет" text="Здесь появятся курсы, которые создадут пользователи" />
            ) : null}

            {courses?.map((course) => (
                <CourseCard
                    key={course.id}
                    course={course}
                    showAuthor
                    onPress={() => router.push({ pathname: '/course/[courseId]', params: { courseId: course.id } })}
                />
            ))}

            {hasMore ? (
                <Button title="Показать ещё" variant="secondary" loading={loadingMore} onPress={loadMore} />
            ) : null}
        </Page>
    );
}
