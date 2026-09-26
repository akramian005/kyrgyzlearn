import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const colorScheme = useColorScheme();

    return (
        // 1. Глобальный провайдер безопасных зон устройства
        <SafeAreaProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <AnimatedSplashOverlay />

                {/* 2. ГЛОБАЛЬНЫЙ ОТСТУП СВЕРХУ: Под камеру, чёлку и статус-бар */}
                <SafeAreaView style={styles.globalContainer} edges={['top', 'left', 'right']}>
                    <View style={styles.content}>

                        {/* 3. ГЛОБАЛЬНОЕ СКРЫТИЕ НИЖНЕЙ ПАНЕЛИ:
                Stack вместо Tabs полностью отключает нижние кнопки (Home / Settings)
                для ВСЕХ экранов приложения */}
                        <Stack screenOptions={{ headerShown: false }} />

                    </View>
                </SafeAreaView>
            </ThemeProvider>
        </SafeAreaProvider>
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