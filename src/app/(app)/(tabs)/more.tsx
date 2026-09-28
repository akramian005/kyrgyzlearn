import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, ErrorBanner, LoadingView, Page, SectionTitle, Title } from '@/components/app-ui';
import { CourseCard } from '@/components/course-card';
import { useApi, useLoader } from '@/lib/hooks';

// «Прочее»: управление своими личными курсами (аккаунт и выход — во вкладке «Профиль»).
// Официальные курсы здесь не редактируются — они лежат файлами на бэкенде (content/official).
export default function MoreScreen() {
    const api = useApi();
    const { data: courses, error, loading, reload } = useLoader(() => api.courses.list());

    const manageable = (courses ?? []).filter((course) => course.type === 'USER');

    if (loading && !courses) return <LoadingView />;

    return (
        <Page onRefresh={reload}>
            <Title>Прочее</Title>

            <View style={styles.sectionRow}>
                <SectionTitle>Мои курсы</SectionTitle>
                <Button title="Создать курс" icon="add" small onPress={() => router.push('/manage/new')} />
            </View>

            <ErrorBanner message={error} />

            {courses && manageable.length === 0 ? (
                <EmptyState
                    icon="create-outline"
                    title="У вас пока нет курсов"
                    text="Создайте свой курс — его смогут найти в поиске и другие пользователи"
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
