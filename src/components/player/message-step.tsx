import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import { AudioButton } from '@/components/audio-button';
import { Markdown } from '@/components/markdown';
import { AppColors } from '@/constants/app-colors';
import type { LessonMessage } from '@/lib/types';

// стиль текста сообщения — им же рисуется предпросмотр в редакторе (MarkdownField)
export const MESSAGE_TEXT_STYLE: TextStyle = {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
};

// Шаг-объяснение перед вопросами: текст (Markdown), картинка и аудио
export function MessageStep({ message }: { message: LessonMessage }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Запомните</Text>

            {message.imageUrl ? (
                <Image source={{ uri: message.imageUrl }} style={styles.image} contentFit="contain" />
            ) : null}

            <View style={styles.bubble}>
                {message.audioUrl ? <AudioButton key={message.audioUrl} url={message.audioUrl} large /> : null}
                <View style={styles.textBox}>
                    <Markdown text={message.text} style={MESSAGE_TEXT_STYLE} />
                </View>
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
    textBox: {
        flex: 1,
    },
});
