import React from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/auth/session';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastHost } from '@/components/toast';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const colorScheme = useColorScheme();

    return (
        // жесты react-native-gesture-handler (перетаскивание в редакторе) работают только внутри этого корня
        <GestureHandlerRootView style={styles.content}>
        {/* 1. Глобальный провайдер безопасных зон устройства */}
        <SafeAreaProvider>
            <SessionProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <AnimatedSplashOverlay />

                    {/* 2. ГЛОБАЛЬНЫЙ ОТСТУП СВЕРХУ: Под камеру, чёлку и статус-бар */}
                    <SafeAreaView style={styles.globalContainer} edges={['top', 'left', 'right']}>
                        <View style={styles.content}>
                            <RootNavigator />
                        </View>
                    </SafeAreaView>

                    {/* всплывающие уведомления поверх всех экранов (например, «Нет связи с сервером») */}
                    <ToastHost />
                </ThemeProvider>
            </SessionProvider>
        </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

function RootNavigator() {
    const { session, isLoading } = useSession();

    // пока читаем сохранённую сессию — ничего не рисуем, чтобы не мигал экран входа
    if (isLoading) return null;

    return (
        // 3. ГЛОБАЛЬНОЕ СКРЫТИЕ НИЖНЕЙ ПАНЕЛИ:
        // Stack вместо Tabs полностью отключает нижние кнопки (Home / Settings)
        // для ВСЕХ экранов приложения
        <Stack screenOptions={{ headerShown: false }}>
            {/* вошёл — доступны экраны приложения, иначе Stack.Protected перекинет на вход */}
            <Stack.Protected guard={!!session}>
                <Stack.Screen name="(app)" />
            </Stack.Protected>

            <Stack.Protected guard={!session}>
                <Stack.Screen name="sign-in" />
                <Stack.Screen name="sign-up" />
            </Stack.Protected>
        </Stack>
    );
}

const styles = StyleSheet.create({
    globalContainer: {
        flex: 1,
        backgroundColor: '#121212', // Задаёт фоновый цвет под статус-баром
    },
    content: {
        flex: 1,
    },
});