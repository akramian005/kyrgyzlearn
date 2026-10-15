import Ionicons from '@expo/vector-icons/Ionicons';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, pressWithBlur } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import type { CourseVideo } from '@/lib/types';

// Строка видео в списке курса — в пару к LessonRow: значок вместо номера, название и действия справа.
// showProgress — при прохождении курса у просмотренного видео золотой значок с галочкой (в редакторе не нужен).
// Нажимается только левая часть: кнопки действий не должны лежать внутри другой кнопки (в вебе это <button> в <button>)
export function VideoRow({ video, onPress, actions, showProgress = false }: {
    video: CourseVideo;
    onPress?: () => void;
    actions?: ReactNode;
    showProgress?: boolean;
}) {
    const empty = video.videoUrl === null;
    const watched = showProgress && video.watched && !empty;

    return (
        <Card style={styles.row}>
            <Pressable
                accessibilityRole={onPress ? 'button' : undefined}
                disabled={!onPress}
                onPress={pressWithBlur(onPress)}
                style={({ pressed }) => [styles.main, pressed && styles.pressed]}
            >
                <View style={[styles.icon, empty && styles.iconEmpty, watched && styles.iconWatched]}>
                    <Ionicons name={watched ? 'checkmark' : 'videocam'} size={watched ? 26 : 20} color="#fff" />
                </View>

                <View style={styles.body}>
                    <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
                    <Text style={styles.meta}>
                        {watched ? <Text style={styles.watched}>Просмотрено · </Text> : null}
                        {empty ? 'Видео ещё не загружено' : 'Видео'}
                    </Text>
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
    iconWatched: {
        backgroundColor: AppColors.gold,
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
    meta: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    watched: {
        color: AppColors.gold,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
