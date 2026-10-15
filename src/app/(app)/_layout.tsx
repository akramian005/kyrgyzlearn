import { Stack } from 'expo-router';

import { AppColors } from '@/constants/app-colors';

// Экраны для вошедших пользователей — доступ к группе закрывает Stack.Protected в корневом _layout.
// (tabs) — нижняя панель; курс и «О курсе» открываются внутри вкладок (см. components/tab-stack.tsx),
// остальные экраны — поверх панели, без неё.
export default function AppLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppColors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="manage/new" />
            <Stack.Screen name="manage/[courseId]" />
            <Stack.Screen name="manage/lesson/[lessonId]" />
            <Stack.Screen name="video/[videoId]" />
            {/* урок проходится на весь экран, как в Duolingo */}
            <Stack.Screen name="lesson/[lessonId]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        </Stack>
    );
}
