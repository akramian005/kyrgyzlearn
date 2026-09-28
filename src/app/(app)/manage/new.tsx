import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorBanner, Muted, Page, ScreenHeader, TextField } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { errorMessage, useApi } from '@/lib/hooks';

// Создание личного курса (официальные курсы лежат файлами на бэкенде и через приложение не создаются)
export default function NewCourseScreen() {
    const api = useApi();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if (!title.trim()) {
            setError('Введите название курса');
            return;
        }

        setError(null);
        setSaving(true);
        try {
            const course = await api.courses.create({ title: title.trim(), description: description.trim() || null });
            // сразу открываем курс, чтобы добавить уроки; «назад» вернёт в «Прочее»
            router.replace({ pathname: '/manage/[courseId]', params: { courseId: course.id } });
        } catch (e) {
            setError(errorMessage(e));
            setSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: AppColors.background }}>
            <ScreenHeader title="Новый курс" />
            <Page>
                <Muted style={{ marginBottom: 20 }}>
                    Курс будет личным: менять его можете только вы, а найти и пройти через поиск — любой пользователь.
                </Muted>

                <ErrorBanner message={error} />

                <TextField label="Название" value={title} onChangeText={setTitle} placeholder="Например: Кыргызский для начинающих" />
                <TextField
                    label="Описание (необязательно)"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="О чём этот курс"
                    multiline
                />

                <Button title="Создать курс" onPress={handleCreate} loading={saving} />
            </Page>
        </View>
    );
}
