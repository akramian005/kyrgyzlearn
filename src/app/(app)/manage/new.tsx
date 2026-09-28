import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { Button, ErrorBanner, Muted, Page, ScreenHeader, TextField } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { errorMessage, useApi } from '@/lib/hooks';

// Создание курса: личного или — из раздела «Админ» (?official=1) — официального
export default function NewCourseScreen() {
    const api = useApi();
    const official = useLocalSearchParams<{ official?: string }>().official === '1';

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
            const course = await api.courses.create({ title: title.trim(), description: description.trim() || null, official });
            // сразу открываем курс, чтобы добавить уроки; «назад» вернёт в «Прочее» / «Админ»
            router.replace({ pathname: '/manage/[courseId]', params: { courseId: course.id } });
        } catch (e) {
            setError(errorMessage(e));
            setSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: AppColors.background }}>
            <ScreenHeader title={official ? 'Новый официальный курс' : 'Новый курс'} />
            <Page>
                <Muted style={{ marginBottom: 20 }}>
                    {official
                        ? 'Курс появится у всех пользователей на главной. Он сохраняется файлом на сервере (official-content), а не в базе.'
                        : 'Курс будет личным: менять его можете только вы, а найти и пройти через поиск — любой пользователь.'}
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
