import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Button, EmptyState, ErrorBanner, LoadingView, Muted, OfflineState, Page, ScreenHeader } from '@/components/app-ui';
import { CourseCard } from '@/components/course-card';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';

// Конструктор курсов (открывается из «Прочего»): свои личные курсы — создать, открыть на редактирование.
// У админа — официальные курсы. Они хранятся не в БД, а JSON-файлами на бэкенде (official-content) —
// бэкенд сам перезаписывает файл после каждой правки.
export default function MyCoursesScreen() {
    const api = useApi();
    const isAdmin = useSession().session?.role === 'ADMIN';
    const { data: courses, error, loading, offline, reload } = useLoader(() => api.courses.list(), 'courses');

    const manageable = (courses ?? []).filter((course) => course.type === (isAdmin ? 'OFFICIAL' : 'USER'));
    const newCourse = () => router.push(isAdmin ? { pathname: '/manage/new', params: { official: '1' } } : '/manage/new');

    return (
        <View style={styles.screen}>
            <ScreenHeader title={isAdmin ? 'Официальные курсы' : 'Мои курсы'} />
            {loading && !courses ? <LoadingView /> : (
                <Page onRefresh={reload}>
                    <View style={styles.sectionRow}>
                        <Muted style={styles.hint}>
                            {isAdmin
                                ? 'Изменения сразу видны всем и сохраняются в файлы курсов на сервере'
                                : 'Ваши курсы можно найти в поиске'}
                        </Muted>
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
                            // пройти курс — экран курса внутри вкладки «Прочее»
                            onOpenCourse={() => router.push({ pathname: '/course/[courseId]', params: { courseId: course.id } })}
                        />
                    ))}
                </Page>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    hint: {
        flex: 1,
        minWidth: 180,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        // отступ до первой карточки курса — раньше SectionTitle давал его сам
        marginBottom: 16,
    },
});
