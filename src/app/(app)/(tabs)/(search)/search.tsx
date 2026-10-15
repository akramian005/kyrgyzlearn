import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';

import { EmptyState, ErrorBanner, LoadingView, Muted, OfflineState, Page, TextField, Title } from '@/components/app-ui';
import { CourseCard } from '@/components/course-card';
import { Pagination } from '@/components/pagination';
import { isConnectionError } from '@/lib/api';
import { errorMessage, useApi } from '@/lib/hooks';
import type { Course } from '@/lib/types';

const PAGE_SIZE = 20;
// ждём, пока пользователь допечатает, чтобы не слать запрос на каждую букву
const SEARCH_DELAY_MS = 350;

// «Поиск»: личные курсы всех пользователей с поиском по названию, по страницам с номерами.
// Курс можно открыть, пройти и сохранить — сохранённые лежат в «Профиле».
export default function SearchScreen() {
    const api = useApi();
    const [query, setQuery] = useState('');
    const [courses, setCourses] = useState<Course[] | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [error, setError] = useState<string | null>(null);
    // нет связи с сервером: о ней сообщает всплывающее уведомление, а вместо вечной загрузки — заглушка
    const [offline, setOffline] = useState(false);
    const [loadingPage, setLoadingPage] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    // номер последнего запроса: ответ на устаревший запрос (старый текст поиска) игнорируем
    const requestId = useRef(0);

    const load = useCallback(async (text: string, pageNumber: number) => {
        const id = ++requestId.current;
        try {
            const result = await api.courses.search(text.trim(), pageNumber, PAGE_SIZE);
            if (id !== requestId.current) return;
            setCourses(result.content);
            setTotal(result.totalElements);
            setPage(pageNumber);
            setError(null);
            setOffline(false);
        } catch (e) {
            if (id !== requestId.current) return;
            setError(errorMessage(e));
            setOffline(isConnectionError(e));
        }
    }, [api]);

    // новый текст поиска — снова с первой страницы
    useEffect(() => {
        const timer = setTimeout(() => void load(query, 0), SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [query, load]);

    // список страницы заменяет предыдущий — возвращаемся к его началу
    const changePage = async (pageNumber: number) => {
        setLoadingPage(true);
        await load(query, pageNumber);
        setLoadingPage(false);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    };

    const pageCount = Math.ceil(total / PAGE_SIZE);

    return (
        <Page ref={scrollRef} onRefresh={() => void load(query, page)}>
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

            {courses === null && !error && !offline ? <LoadingView /> : null}

            {courses === null && offline ? <OfflineState onRetry={() => void load(query, page)} /> : null}

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

            <Pagination page={page} pageCount={pageCount} onChange={changePage} disabled={loadingPage} />
        </Page>
    );
}
