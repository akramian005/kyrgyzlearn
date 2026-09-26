import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/auth/session';
import { Button, ErrorBanner, Muted, Page, ScreenHeader, TextField } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { errorMessage, useApi } from '@/lib/hooks';

// Создание курса. Тип (официальный/личный) бэкенд выбирает сам по роли автора
export default function NewCourseScreen() {
    const { session } = useSession();
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
                    {session?.role === 'ADMIN'
                        ? 'Курс будет официальным — его увидят все пользователи на главной.'
                        : 'Курс будет личным — его видите только вы.'}
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
