import Ionicons from '@expo/vector-icons/Ionicons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppColors } from '@/constants/app-colors';

// на iOS без этого звук не играет, если телефон в беззвучном режиме
let audioModeReady: Promise<void> | null = null;
function ensureAudioMode() {
    audioModeReady ??= setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    return audioModeReady;
}

// Кнопка «прослушать». Используйте key={url}, чтобы при смене файла создавался новый плеер
export function AudioButton({ url, label = 'Прослушать', large }: { url: string; label?: string; large?: boolean }) {
    const player = useAudioPlayer(url);
    const status = useAudioPlayerStatus(player);

    const toggle = async () => {
        if (status.playing) {
            player.pause();
            return;
        }
        await ensureAudioMode();
        // после окончания плеер стоит в конце — перематываем в начало
        if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.1)) {
            await player.seekTo(0);
        }
        player.play();
    };

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={status.playing ? 'Пауза' : label}
            onPress={toggle}
            style={({ pressed }) => [styles.button, large && styles.large, pressed && styles.pressed]}
        >
            <Ionicons
                name={status.playing ? 'pause' : 'volume-high'}
                size={large ? 28 : 18}
                color={AppColors.blue}
            />
            {large ? null : <Text style={styles.text}>{status.playing ? 'Пауза' : label}</Text>}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        borderWidth: 2,
        borderColor: AppColors.blue,
        backgroundColor: AppColors.blueBackground,
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    large: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    pressed: {
        opacity: 0.7,
    },
    text: {
        color: AppColors.blue,
        fontWeight: '700',
        fontSize: 14,
    },
});
