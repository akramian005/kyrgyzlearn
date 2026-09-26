import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Badge, Button, Card, EmptyState, ErrorBanner, LoadingView, Page, SectionTitle, Title } from '@/components/app-ui';
import { CourseCard } from '@/components/course-card';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';

// «Прочее»: аккаунт, выход и управление своими курсами.
// Админ управляет официальными курсами, пользователь — своими личными (их видит только он).
export default function MoreScreen() {
    const { session, signOut } = useSession();
    const api = useApi();
    const { data: courses, error, loading, reload } = useLoader(() => api.courses.list());

    const isAdmin = session?.role === 'ADMIN';
    const manageable = (courses ?? []).filter((course) => course.type === (isAdmin ? 'OFFICIAL' : 'USER'));

    if (loading && !courses) return <LoadingView />;

    return (
        <Page onRefresh={reload}>
            <Title>Прочее</Title>

            <Card style={styles.account}>
                <View style={styles.accountInfo}>
                    <Text style={styles.email} numberOfLines={1}>{session?.email}</Text>
                    {isAdmin ? <Badge label="Админ" /> : <Badge label="Ученик" color={AppColors.blue} />}
                </View>
                <Button title="Выйти" icon="log-out-outline" variant="secondary" small onPress={signOut} />
            </Card>

            <View style={styles.sectionRow}>
                <SectionTitle>{isAdmin ? 'Официальные курсы' : 'Мои курсы'}</SectionTitle>
                <Button title="Создать курс" icon="add" small onPress={() => router.push('/manage/new')} />
            </View>

            <ErrorBanner message={error} />

            {courses && manageable.length === 0 ? (
                <EmptyState
                    icon="create-outline"
                    title="У вас пока нет курсов"
                    text={isAdmin
                        ? 'Созданные вами курсы увидят все пользователи на главной'
                        : 'Создайте свой курс — его будете видеть только вы'}
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
    account: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    accountInfo: {
        flexShrink: 1,
        gap: 6,
    },
    email: {
        color: AppColors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
});
