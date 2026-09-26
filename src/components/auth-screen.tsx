import React, { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppColors } from '@/constants/app-colors';

// Каркас экранов входа/регистрации: заголовок + форма в верхней части экрана, прокрутка при открытой клавиатуре
export function AuthScreen({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
    const { height } = useWindowDimensions();

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.flex}
                contentContainerStyle={[styles.content, { paddingTop: height * TOP_OFFSET }]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.form}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                    {children}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// отступ формы от верха — доля высоты экрана
const TOP_OFFSET = 0.12;

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    form: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
    },
    title: {
        color: AppColors.text,
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 6,
    },
    subtitle: {
        color: AppColors.textSecondary,
        fontSize: 16,
        marginBottom: 28,
    },
});
