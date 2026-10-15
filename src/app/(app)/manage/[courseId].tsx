import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorBanner,
    goBack,
    IconButton,
    LoadingView,
    Page,
    ScreenHeader,
    SectionTitle,
    TextField,
} from '@/components/app-ui';
import { MarkdownField } from '@/components/editor/markdown-field';
import { emptyMedia, MediaField, mediaPreview } from '@/components/editor/media-field';
import { DESCRIPTION_TEXT_STYLE } from '@/components/markdown';
import { VideoForm } from '@/components/editor/video-form';
import { lessonNumber, LessonRow } from '@/components/lesson-row';
import { VideoRow } from '@/components/video-row';
import { AppColors } from '@/constants/app-colors';
import { confirmAsync } from '@/lib/confirm';
import { errorMessage, useApi, useLoader } from '@/lib/hooks';
import { applyMedia } from '@/lib/lesson-drafts';
import type { Course, CourseItem, CourseVideo, Unit } from '@/lib/types';
import { newVideoDraft, saveVideo, videoToDraft } from '@/lib/video-drafts';

// какое видео сейчас открыто в форме: новое (в конец юнита unitId) или существующее
type VideoEditing = { mode: 'new'; unitId: number } | { mode: 'edit'; videoId: number };

// Управление курсом: название/описание, юниты с уроками и видео (порядок, пройти, изменить, удалить),
// новый юнит, урок или видео, удаление курса. Личные курсы пользователь проходит отсюда же — на главной их нет.
export default function ManageCourseScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const id = Number(courseId);
    const api = useApi();

    const { data, error, loading, reload, setData } = useLoader(async () => {
        const [course, units] = await Promise.all([api.courses.get(id), api.courses.units(id)]);
        return { course, units };
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

    // урок или видео на место position в юните unitId (бэкенд сдвигает остальные)
    const moveItem = (item: CourseItem, position: number, unitId: number) => run(async () => {
        await api.courses.moveItem(id, item, position, unitId);
        await reload();
    });

    const moveUnit = (unit: Unit, position: number) => run(async () => {
        const units = await api.units.move(id, unit.id, position);
        if (data) setData({ ...data, units });
    });

    const renameUnit = (unit: Unit, title: string) => run(async () => {
        await api.units.rename(id, unit.id, title);
        await reload();
    });

    const deleteUnit = async (unit: Unit) => {
        if (!(await confirmAsync('Удалить юнит?', `«${unit.title}» будет удалён.`))) return;
        await run(async () => {
            await api.units.remove(id, unit.id);
            await reload();
        });
    };

    // новый урок без названия — сразу в редактор, чтобы добавить вопросы
    const createLesson = (unit: Unit) => run(async () => {
        const lesson = await api.lessons.create(id, { unitId: unit.id });
        router.push({ pathname: '/manage/lesson/[lessonId]', params: { lessonId: lesson.id } });
    });

    const deleteLesson = async (lessonId: number, number: number) => {
        if (!(await confirmAsync('Удалить урок?', `Урок ${number} и все его вопросы будут удалены.`))) return;
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
            // курс удалён — возвращаться на его экран нельзя, запасной путь — список курсов
            goBack('/my-courses');
        } catch (e) {
            setActionError(errorMessage(e));
        }
    };

    const renderItem = (unitIndex: number, item: CourseItem, index: number) => {
        if (!data) return null;
        const units = data.units;
        const unit = units[unitIndex];
        const prev = units[unitIndex - 1];
        const next = units[unitIndex + 1];

        // стрелки двигают внутри юнита, а с края — в соседний юнит (в конец предыдущего или в начало следующего)
        const up = index > 0 ? () => moveItem(item, index - 1, unit.id) : prev ? () => moveItem(item, prev.items.length, prev.id) : undefined;
        const down = index < unit.items.length - 1 ? () => moveItem(item, index + 1, unit.id) : next ? () => moveItem(item, 0, next.id) : undefined;
        const arrows = (
            <>
                <IconButton icon="arrow-up" label="Выше" onPress={() => up?.()} disabled={!up} />
                <IconButton icon="arrow-down" label="Ниже" onPress={() => down?.()} disabled={!down} />
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
                            <IconButton icon="trash-outline" label="Удалить видео" color={AppColors.error} onPress={() => deleteVideo(item)} />
                        </>
                    )}
                />
            );
        }

        const number = lessonNumber(unit.items, item);
        return (
            <LessonRow
                key={`LESSON-${item.id}`}
                lesson={item}
                index={number}
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
                        <IconButton icon="trash-outline" label="Удалить урок" color={AppColors.error} onPress={() => deleteLesson(item.id, number + 1)} />
                    </>
                )}
            />
        );
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

                            <SectionTitle>Юниты</SectionTitle>

                            {data.units.length === 0 ? (
                                <EmptyState icon="layers-outline" title="Юнитов пока нет" text="Добавьте первый юнит ниже" />
                            ) : null}

                            {data.units.map((unit, unitIndex) => (
                                <View key={unit.id} style={styles.unit}>
                                    <UnitHeader
                                        unit={unit}
                                        number={unitIndex + 1}
                                        canMoveUp={unitIndex > 0}
                                        canMoveDown={unitIndex < data.units.length - 1}
                                        onMove={(delta) => moveUnit(unit, unitIndex + delta)}
                                        onRename={(title) => renameUnit(unit, title)}
                                        onDelete={() => deleteUnit(unit)}
                                    />

                                    {unit.items.length === 0 ? (
                                        <Text style={styles.unitEmpty}>В юните пока нет уроков и видео</Text>
                                    ) : null}
                                    {unit.items.map((item, index) => renderItem(unitIndex, item, index))}

                                    {videoEditing?.mode === 'new' && videoEditing.unitId === unit.id ? (
                                        <VideoForm
                                            initial={newVideoDraft()}
                                            isNew
                                            onCancel={() => setVideoEditing(null)}
                                            onSave={async (draft) => {
                                                await saveVideo(api, id, null, draft, unit.id);
                                                await afterVideoSave();
                                            }}
                                        />
                                    ) : (
                                        <View style={styles.unitButtons}>
                                            <Button title="Урок" icon="add" variant="secondary" small onPress={() => createLesson(unit)} style={styles.flex} />
                                            <Button
                                                title="Видео"
                                                icon="videocam-outline"
                                                variant="secondary"
                                                small
                                                onPress={() => setVideoEditing({ mode: 'new', unitId: unit.id })}
                                                style={styles.flex}
                                            />
                                        </View>
                                    )}
                                </View>
                            ))}

                            <NewUnitForm courseId={id} unitCount={data.units.length} onCreated={reload} onError={setActionError} />

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

// Шапка юнита: номер, название (меняется прямо здесь), порядок и удаление
function UnitHeader({ unit, number, canMoveUp, canMoveDown, onMove, onRename, onDelete }: {
    unit: Unit;
    number: number;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMove: (delta: -1 | 1) => void;
    onRename: (title: string) => Promise<void>;
    onDelete: () => void;
}) {
    const [title, setTitle] = useState(unit.title);
    const [saving, setSaving] = useState(false);
    const changed = title.trim() !== unit.title && title.trim() !== '';

    const save = async () => {
        setSaving(true);
        try {
            await onRename(title.trim());
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card style={styles.unitHeader}>
            <View style={styles.unitTop}>
                <Text style={styles.unitNumber}>Юнит {number}</Text>
                <View style={styles.unitActions}>
                    <IconButton icon="arrow-up" label="Юнит выше" onPress={() => onMove(-1)} disabled={!canMoveUp} />
                    <IconButton icon="arrow-down" label="Юнит ниже" onPress={() => onMove(1)} disabled={!canMoveDown} />
                    <IconButton
                        icon="trash-outline"
                        label="Удалить юнит"
                        color={AppColors.error}
                        // удалить можно только пустой юнит — уроки и видео сначала удаляют или переносят стрелками
                        disabled={unit.items.length > 0}
                        onPress={onDelete}
                    />
                </View>
            </View>
            <TextField label="Название юнита" value={title} onChangeText={setTitle} />
            {changed ? (
                <View style={styles.formButtons}>
                    <Button title="Отмена" variant="ghost" small onPress={() => setTitle(unit.title)} disabled={saving} style={styles.flex} />
                    <Button title="Сохранить" icon="checkmark" small onPress={save} loading={saving} style={styles.flex} />
                </View>
            ) : null}
        </Card>
    );
}

function CourseForm({ course, onSaved }: { course: Course; onSaved: () => Promise<void> }) {
    const api = useApi();
    const [title, setTitle] = useState(course.title);
    const [description, setDescription] = useState(course.description ?? '');
    // картинка загружается или удаляется вместе с сохранением названия и описания
    const [image, setImage] = useState(() => emptyMedia(course.imageUrl));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const textChanged = title.trim() !== course.title || (description.trim() || null) !== (course.description || null);
    const changed = textChanged || image.picked !== null || image.removed;

    const handleSave = async () => {
        if (!title.trim()) {
            setError('Название не может быть пустым');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            if (textChanged) {
                await api.courses.update(course.id, { title: title.trim(), description: description.trim() || null });
            }
            await applyMedia(image, (file) => api.courses.uploadImage(course.id, file), () => api.courses.removeImage(course.id));
            // картинка сохранена — форма больше не считает её изменённой
            setImage(emptyMedia(mediaPreview(image)));
            await onSaved();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    // отменить правки — вернуть сохранённые название, описание и картинку
    const handleCancel = () => {
        setTitle(course.title);
        setDescription(course.description ?? '');
        setImage(emptyMedia(course.imageUrl));
        setError(null);
    };

    return (
        <View style={{ marginTop: 16 }}>
            <ErrorBanner message={error} />
            <MediaField kind="image" label="Картинка курса (необязательно)" draft={image} onChange={setImage} />
            <TextField label="Название курса" value={title} onChangeText={setTitle} />
            <MarkdownField
                label="Описание"
                value={description}
                onChangeText={setDescription}
                placeholder="О чём этот курс"
                previewStyle={DESCRIPTION_TEXT_STYLE}
            />
            {changed ? (
                <View style={styles.formButtons}>
                    <Button title="Отмена" variant="ghost" onPress={handleCancel} disabled={saving} style={styles.flex} />
                    <Button title="Сохранить" icon="checkmark" onPress={handleSave} loading={saving} style={styles.flex} />
                </View>
            ) : null}
        </View>
    );
}

// Новый юнит в конец курса
function NewUnitForm({ courseId, unitCount, onCreated, onError }: {
    courseId: number;
    unitCount: number;
    onCreated: () => Promise<void>;
    onError: (message: string | null) => void;
}) {
    const api = useApi();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [saving, setSaving] = useState(false);

    if (!open) {
        return (
            <Button
                title="Добавить юнит"
                icon="add"
                variant="secondary"
                onPress={() => {
                    setTitle(`Юнит ${unitCount + 1}`);
                    setOpen(true);
                }}
            />
        );
    }

    const handleCreate = async () => {
        if (!title.trim()) {
            onError('Введите название юнита');
            return;
        }
        onError(null);
        setSaving(true);
        try {
            await api.units.create(courseId, title.trim());
            setOpen(false);
            await onCreated();
        } catch (e) {
            onError(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <TextField label="Название юнита" value={title} onChangeText={setTitle} placeholder="Например: Приветствие" autoFocus />
            <View style={styles.formButtons}>
                <Button title="Отмена" variant="ghost" onPress={() => setOpen(false)} style={styles.flex} />
                <Button title="Создать" icon="checkmark" onPress={handleCreate} loading={saving} style={styles.flex} />
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    unit: {
        marginBottom: 20,
    },
    unitHeader: {
        borderColor: AppColors.blue,
        backgroundColor: AppColors.blueBackground,
    },
    unitTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: -8,
        marginBottom: 4,
    },
    unitNumber: {
        color: AppColors.blue,
        fontSize: 14,
        fontWeight: '800',
    },
    unitActions: {
        flexDirection: 'row',
        marginRight: -8,
    },
    unitEmpty: {
        color: AppColors.textSecondary,
        fontSize: 14,
        marginBottom: 12,
    },
    unitButtons: {
        flexDirection: 'row',
        gap: 12,
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
