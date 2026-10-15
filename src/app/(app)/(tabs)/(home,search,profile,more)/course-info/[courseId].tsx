import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorBanner, LoadingView, Muted, OfflineState, Page, ScreenHeader } from '@/components/app-ui';
import { courseAuthor, CourseCover, courseProgressLabel } from '@/components/course-card';
import { DESCRIPTION_TEXT_STYLE, Markdown } from '@/components/markdown';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';

// «О курсе»: открывается кнопкой с тетрадкой на экране курса.
// Сверху картинка слева и название справа, ниже полное описание. Назад — стрелкой в шапке.
export default function CourseInfoScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const id = Number(courseId);
    const api = useApi();
    const { data: course, error, loading, offline, reload } = useLoader(() => api.courses.get(id), `course-info-${id}`);

    const progress = course ? courseProgressLabel(course) : null;

    return (
        <View style={styles.screen}>
            <ScreenHeader title="О курсе" />

            {loading && !course ? <LoadingView /> : (
                <Page onRefresh={reload}>
                    <ErrorBanner message={error} />
                    {offline && !course ? <OfflineState onRetry={() => void reload()} /> : null}

                    {course ? (
                        <>
                            <View style={styles.head}>
                                <CourseCover course={course} style={styles.cover} />
                                <View style={styles.headText}>
                                    <Text style={styles.title}>{course.title}</Text>
                                    <Muted>{courseAuthor(course)}</Muted>
                                    {progress ? <Text style={styles.progress}>{progress}</Text> : null}
                                </View>
                            </View>

                            {course.description ? (
                                <Markdown text={course.description} style={DESCRIPTION_TEXT_STYLE} />
                            ) : (
                                <Muted>Описания пока нет</Muted>
                            )}

                        </>
                    ) : null}
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
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    // горизонтальная картинка 4:3, как на карточке курса на главной
    cover: {
        width: '45%',
        maxWidth: 280,
        aspectRatio: 4 / 3,
        borderRadius: 16,
    },
    headText: {
        flex: 1,
        gap: 6,
    },
    title: {
        color: AppColors.text,
        fontSize: 24,
        fontWeight: '800',
    },
    progress: {
        color: AppColors.gold,
        fontSize: 14,
        fontWeight: '700',
    },
});
