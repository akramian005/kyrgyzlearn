import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorBanner,
    IconButton,
    LoadingView,
    Page,
    ScreenHeader,
    SectionTitle,
    TextField,
} from '@/components/app-ui';
import { LessonRow } from '@/components/lesson-row';
import { AppColors } from '@/constants/app-colors';
import { confirmAsync } from '@/lib/confirm';
import { errorMessage, useApi, useLoader } from '@/lib/hooks';
import type { Course } from '@/lib/types';

// Управление курсом: название/описание, уроки (пройти, изменить, удалить), новый урок, удаление курса.
// Личные курсы пользователь проходит отсюда же — на главной их нет.
export default function ManageCourseScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const id = Number(courseId);
    const api = useApi();

    const { data, error, loading, reload } = useLoader(async () => {
        const [course, lessons] = await Promise.all([api.courses.get(id), api.lessons.listByCourse(id)]);
        return { course, lessons };
    });

    const [actionError, setActionError] = useState<string | null>(null);

    const deleteLesson = async (lessonId: number, title: string) => {
        if (!(await confirmAsync('Удалить урок?', `«${title}» и все его вопросы будут удалены.`))) return;
        try {
            await api.lessons.remove(lessonId);
            await reload();
        } catch (e) {
            setActionError(errorMessage(e));
        }
    };

    const deleteCourse = async () => {
        if (!data) return;
        if (!(await confirmAsync('Удалить курс?', `«${data.course.title}» и все его уроки будут удалены без возможности восстановления.`))) return;
        try {
            await api.courses.remove(id);
            router.back();
        } catch (e) {
            setActionError(errorMessage(e));
        }
    };

    return (
        <View style={styles.screen}>
            <ScreenHeader title={data?.course.title ?? 'Курс'} />

            {loading && !data ? <LoadingView /> : (
                <Page onRefresh={reload}>
                    <ErrorBanner message={error ?? actionError} />

                    {data ? (
                        <>
                            <Badge
                                label={data.course.type === 'OFFICIAL' ? 'Официальный курс' : 'Личный курс'}
                                color={data.course.type === 'OFFICIAL' ? AppColors.accent : AppColors.blue}
                            />

                            <CourseForm key={data.course.id} course={data.course} onSaved={reload} />

                            <SectionTitle>Уроки</SectionTitle>

                            {data.lessons.length === 0 ? (
                                <EmptyState icon="book-outline" title="Уроков пока нет" text="Добавьте первый урок ниже" />
                            ) : null}

                            {data.lessons.map((lesson, index) => (
                                <LessonRow
                                    key={lesson.id}
                                    lesson={lesson}
                                    index={index}
                                    onPress={() => router.push({ pathname: '/manage/lesson/[lessonId]', params: { lessonId: lesson.id } })}
                                    actions={(
                                        <>
                                            <IconButton
                                                icon="play-circle"
                                                label="Пройти урок"
                                                color={AppColors.accent}
                                                disabled={lesson.itemCount === 0}
                                                onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } })}
                                            />
                                            <IconButton
                                                icon="trash-outline"
                                                label="Удалить урок"
                                                color={AppColors.error}
                                                onPress={() => deleteLesson(lesson.id, lesson.title)}
                                            />
                                        </>
                                    )}
                                />
                            ))}

                            <NewLessonForm courseId={id} onError={setActionError} />

                            <View style={styles.danger}>
                                <Button title="Удалить курс" icon="trash-outline" variant="danger" onPress={deleteCourse} />
                            </View>
                        </>
                    ) : null}
                </Page>
            )}
        </View>
    );
}

function CourseForm({ course, onSaved }: { course: Course; onSaved: () => Promise<void> }) {
    const api = useApi();
    const [title, setTitle] = useState(course.title);
    const [description, setDescription] = useState(course.description ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const changed = title.trim() !== course.title || (description.trim() || null) !== (course.description || null);

    const handleSave = async () => {
        if (!title.trim()) {
            setError('Название не может быть пустым');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await api.courses.update(course.id, { title: title.trim(), description: description.trim() || null });
            await onSaved();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={{ marginTop: 16 }}>
            <ErrorBanner message={error} />
            <TextField label="Название курса" value={title} onChangeText={setTitle} />
            <TextField label="Описание" value={description} onChangeText={setDescription} multiline placeholder="О чём этот курс" />
            {changed ? <Button title="Сохранить" icon="checkmark" onPress={handleSave} loading={saving} /> : null}
        </View>
    );
}

// Новый урок: после создания сразу открываем редактор, чтобы добавить вопросы
function NewLessonForm({ courseId, onError }: { courseId: number; onError: (message: string | null) => void }) {
    const api = useApi();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    if (!open) {
        return <Button title="Добавить урок" icon="add" variant="secondary" onPress={() => setOpen(true)} />;
    }

    const handleCreate = async () => {
        if (!title.trim()) {
            onError('Введите название урока');
            return;
        }
        onError(null);
        setSaving(true);
        try {
            const lesson = await api.lessons.create(courseId, { title: title.trim(), description: description.trim() || null });
            setOpen(false);
            setTitle('');
            setDescription('');
            router.push({ pathname: '/manage/lesson/[lessonId]', params: { lessonId: lesson.id } });
        } catch (e) {
            onError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <TextField label="Название урока" value={title} onChangeText={setTitle} placeholder="Например: Приветствие" autoFocus />
            <TextField label="Описание (необязательно)" value={description} onChangeText={setDescription} multiline />
            <View style={styles.formButtons}>
                <Button title="Отмена" variant="ghost" onPress={() => setOpen(false)} style={styles.flex} />
                <Button title="Создать и заполнить" onPress={handleCreate} loading={saving} style={styles.flex} />
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    danger: {
        marginTop: 40,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
        paddingTop: 20,
    },
    formButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    flex: {
        flex: 1,
    },
});
