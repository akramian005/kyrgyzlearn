import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/audio-button';
import { AppColors } from '@/constants/app-colors';
import type { LessonMessage } from '@/lib/types';

// Шаг-объяснение перед вопросами: текст, картинка и аудио
export function MessageStep({ message }: { message: LessonMessage }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Запомните</Text>

            {message.imageUrl ? (
                <Image source={{ uri: message.imageUrl }} style={styles.image} contentFit="contain" />
            ) : null}

            <View style={styles.bubble}>
                {message.audioUrl ? <AudioButton key={message.audioUrl} url={message.audioUrl} large /> : null}
                <Text style={styles.text}>{message.text}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 20,
    },
    label: {
        color: AppColors.blue,
        fontSize: 15,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    image: {
        width: '100%',
        aspectRatio: 4 / 3,
        maxHeight: 320,
        borderRadius: 16,
        backgroundColor: AppColors.surface,
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: AppColors.surface,
        borderColor: AppColors.border,
        borderWidth: 2,
        borderRadius: 16,
        padding: 16,
    },
    text: {
        flex: 1,
        color: AppColors.text,
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
    },
});
