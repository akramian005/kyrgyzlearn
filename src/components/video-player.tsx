import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// Видео со стандартными кнопками плеера (пауза, перемотка, полный экран).
// Используйте key={url}, чтобы при смене файла создавался новый плеер
export function VideoPlayer({ url, style }: { url: string; style?: StyleProp<ViewStyle> }) {
    const player = useVideoPlayer(url);

    return (
        <VideoView
            player={player}
            nativeControls
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
            style={[styles.video, style]}
        />
    );
}

const styles = StyleSheet.create({
    video: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
});
