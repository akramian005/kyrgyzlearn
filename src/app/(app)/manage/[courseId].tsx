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
    Muted,
    Page,
    ScreenHeader,
    SectionTitle,
    TextField,
} from '@/components/app-ui';
import { VideoForm } from '@/components/editor/video-form';
import { lessonNumber, LessonRow } from '@/components/lesson-row';
import { VideoRow } from '@/components/video-row';
import { AppColors } from '@/constants/app-colors';
import { confirmAsync } from '@/lib/confirm';
import { errorMessage, useApi, useLoader } from '@/lib/hooks';
import type { Course, CourseItem, CourseVideo } from '@/lib/types';
import { newVideoDraft, saveVideo, videoToDraft } from '@/lib/video-drafts';

// какое видео сейчас открыто в форме: новое (в конец курса) или существующее
type VideoEditing = { mode: 'new' } | { mode: 'edit'; videoId: number };

// Управление курсом: название/описание, уроки и видео одним списком (порядок, пройти, изменить, удалить),
// новый урок или видео, удаление курса. Личные курсы пользователь проходит отсюда же — на главной их нет.
export default function ManageCourseScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const id = Number(courseId);
    const api = useApi();

    const { data, error, loading, reload, setData } = useLoader(async () => {
        const [course, items] = await Promise.all([api.courses.get(id), api.courses.items(id)]);
        return { course, items };
    });

    const [actionError, setActionError] = useState<string | null>(null);
    const [videoEditing, setVideoEditing] = useState<VideoEditing | null>(null);

    const run = async (action: () => Promise<void>) => {
        setActionError(null);
        try {
            await action();
        } catch (e) {
            setActionError(errorMessage(e));
            await reload();
        }
    };

    // index — место в общем списке уроков и видео; бэкенд сдвигает остальные элементы
    const move = (item: CourseItem, index: number, delta: -1 | 1) => run(async () => {
        const items = await api.courses.moveItem(id, item, index + delta);
        if (data) setData({ ...data, items });
    });

    const deleteLesson = async (lessonId: number, title: string) => {
        if (!(await confirmAsync('Удалить урок?', `«${title}» и все его вопросы будут удалены.`))) return;
        await run(async () => {
            await api.lessons.remove(lessonId);
            await reload();
        });
    };

    const deleteVideo = async (video: CourseVideo) => {
        if (!(await confirmAsync('Удалить видео?', `«${video.title}» будет удалено вместе с файлом.`))) return;
        await run(async () => {
            await api.videos.remove(id, video.id);
            await reload();
        });
    };

    const afterVideoSave = async () => {
        setVideoEditing(null);
        await reload();
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

                            <SectionTitle>Уроки и видео</SectionTitle>
                            <Muted style={styles.hint}>
                                Ученик видит уроки и видео в этом порядке — стрелками можно поставить видео между уроками.
                            </Muted>

                            {data.items.length === 0 ? (
                                <EmptyState icon="book-outline" title="Уроков пока нет" text="Добавьте первый урок или видео ниже" />
                            ) : null}

                            {data.items.map((item, index) => {
                                const arrows = (
                                    <>
                                        <IconButton icon="arrow-up" label="Выше" onPress={() => move(item, index, -1)} disabled={index === 0} />
                                        <IconButton
                                            icon="arrow-down"
                                            label="Ниже"
                                            onPress={() => move(item, index, 1)}
                                            disabled={index === data.items.length - 1}
                                        />
                                    </>
                                );

                                if (item.kind === 'VIDEO') {
                                    if (videoEditing?.mode === 'edit' && videoEditing.videoId === item.id) {
                                        return (
                                            <VideoForm
                                                key={`VIDEO-${item.id}`}
                                                initial={videoToDraft(item)}
                                                isNew={false}
                                                onCancel={() => setVideoEditing(null)}
                                                onSave={async (draft) => {
                                                    await saveVideo(api, id, item, draft);
                                                    await afterVideoSave();
                                                }}
                                            />
                                        );
                                    }
                                    return (
                                        <VideoRow
                                            key={`VIDEO-${item.id}`}
                                            video={item}
                                            onPress={() => setVideoEditing({ mode: 'edit', videoId: item.id })}
                                            actions={(
                                                <>
                                                    {arrows}
                                                    <IconButton
                                                        icon="play-circle"
                                                        label="Смотреть видео"
                                                        color={AppColors.blue}
                                                        disabled={item.videoUrl === null}
                                                        onPress={() => router.push({ pathname: '/video/[videoId]', params: { videoId: item.id, courseId: id } })}
                                                    />
                                                    <IconButton
                                                        icon="trash-outline"
                                                        label="Удалить видео"
                                                        color={AppColors.error}
                                                        onPress={() => deleteVideo(item)}
                                                    />
                                                </>
                                            )}
                                        />
                                    );
                                }

                                return (
                                    <LessonRow
                                        key={`LESSON-${item.id}`}
                                        lesson={item}
                                        index={lessonNumber(data.items, item)}
                                        onPress={() => router.push({ pathname: '/manage/lesson/[lessonId]', params: { lessonId: item.id } })}
                                        actions={(
                                            <>
                                                {arrows}
                                                <IconButton
                                                    icon="play-circle"
                                                    label="Пройти урок"
                                                    color={AppColors.accent}
                                                    disabled={item.itemCount === 0}
                                                    onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: item.id } })}
                                                />
                                                <IconButton
                                                    icon="trash-outline"
                                                    label="Удалить урок"
                                                    color={AppColors.error}
                                                    onPress={() => deleteLesson(item.id, item.title)}
                                                />
                                            </>
                                        )}
                                    />
                                );
                            })}

                            <NewLessonForm courseId={id} onError={setActionError} />

                            <View style={styles.addVideo}>
                                {videoEditing?.mode === 'new' ? (
                                    <VideoForm
                                        initial={newVideoDraft()}
                                        isNew
                                        onCancel={() => setVideoEditing(null)}
                                        onSave={async (draft) => {
                                            await saveVideo(api, id, null, draft);
                                            await afterVideoSave();
                                        }}
                                    />
                                ) : (
                                    <Button
                                        title="Добавить видео"
                                        icon="videocam-outline"
                                        variant="secondary"
                                        onPress={() => setVideoEditing({ mode: 'new' })}
                                    />
                                )}
                            </View>

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
    hint: {
        marginTop: -4,
        marginBottom: 12,
    },
    addVideo: {
        marginTop: 12,
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
