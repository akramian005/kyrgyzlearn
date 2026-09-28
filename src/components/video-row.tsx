import Ionicons from '@expo/vector-icons/Ionicons';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import type { CourseVideo } from '@/lib/types';

// Строка видео в списке курса — в пару к LessonRow: значок вместо номера, название и действия справа.
// Нажимается только левая часть: кнопки действий не должны лежать внутри другой кнопки (в вебе это <button> в <button>)
export function VideoRow({ video, onPress, actions }: {
    video: CourseVideo;
    onPress?: () => void;
    actions?: ReactNode;
}) {
    const empty = video.videoUrl === null;

    return (
        <Card style={styles.row}>
            <Pressable
                accessibilityRole={onPress ? 'button' : undefined}
                disabled={!onPress}
                onPress={onPress}
                style={({ pressed }) => [styles.main, pressed && styles.pressed]}
            >
                <View style={[styles.icon, empty && styles.iconEmpty]}>
                    <Ionicons name="videocam" size={20} color="#fff" />
                </View>

                <View style={styles.body}>
                    <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
                    {video.description ? (
                        <Text style={styles.description} numberOfLines={2}>{video.description}</Text>
                    ) : null}
                    <Text style={styles.meta}>{empty ? 'Видео ещё не загружено' : 'Видео'}</Text>
                </View>
            </Pressable>

            {actions ? <View style={styles.actions}>{actions}</View> : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    main: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    pressed: {
        opacity: 0.7,
    },
    icon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: AppColors.blue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconEmpty: {
        backgroundColor: AppColors.border,
    },
    body: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: AppColors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    description: {
        color: AppColors.textSecondary,
        fontSize: 14,
    },
    meta: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
