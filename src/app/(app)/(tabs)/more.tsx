import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Button, EmptyState, ErrorBanner, LoadingView, Muted, OfflineState, Page, SectionTitle, Title } from '@/components/app-ui';
import { CourseCard } from '@/components/course-card';
import { useApi, useLoader } from '@/lib/hooks';

// «Прочее»: управление своими личными курсами (аккаунт и выход — во вкладке «Профиль»).
// У админа вместо него раздел «Админ»: редактирование официальных курсов. Они хранятся не в БД,
// а JSON-файлами на бэкенде (official-content) — бэкенд сам перезаписывает файл после каждой правки.
export default function MoreScreen() {
    const api = useApi();
    const isAdmin = useSession().session?.role === 'ADMIN';
    const { data: courses, error, loading, offline, reload } = useLoader(() => api.courses.list(), 'courses');

    const manageable = (courses ?? []).filter((course) => course.type === (isAdmin ? 'OFFICIAL' : 'USER'));
    const newCourse = () => router.push(isAdmin ? { pathname: '/manage/new', params: { official: '1' } } : '/manage/new');

    if (loading && !courses) return <LoadingView />;

    return (
        <Page onRefresh={reload}>
            <Title>{isAdmin ? 'Админ' : 'Прочее'}</Title>
            {isAdmin ? (
                <Muted style={{ marginTop: -10, marginBottom: 8 }}>
                    Изменения сразу видны всем и сохраняются в файлы курсов на сервере
                </Muted>
            ) : null}

            <View style={styles.sectionRow}>
                <SectionTitle>{isAdmin ? 'Официальные курсы' : 'Мои курсы'}</SectionTitle>
                <Button title="Создать курс" icon="add" small onPress={newCourse} />
            </View>

            <ErrorBanner message={error} />
            {offline && !courses ? <OfflineState onRetry={() => void reload()} /> : null}

            {courses && manageable.length === 0 ? (
                <EmptyState
                    icon="create-outline"
                    title={isAdmin ? 'Официальных курсов пока нет' : 'У вас пока нет курсов'}
                    text={isAdmin
                        ? 'Созданный курс появится у всех пользователей на главной'
                        : 'Создайте свой курс — его смогут найти в поиске и другие пользователи'}
                />
            ) : null}

            {manageable.map((course) => (
                <CourseCard
                    key={course.id}
                    course={course}
                    actionIcon="create-outline"
                    onPress={() => router.push({ pathname: '/manage/[courseId]', params: { courseId: course.id } })}
                />
            ))}
        </Page>
    );
}

const styles = StyleSheet.create({
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
});
