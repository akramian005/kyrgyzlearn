import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/app-colors';
import { subscribeToast } from '@/lib/toast';

const VISIBLE_MS = 2500;
const FADE_MS = 200;

// Круглая «таблетка» внизу экрана: появляется на пару секунд и сама исчезает (см. lib/toast).
// Нажатия проходят сквозь неё — она ничего не перекрывает.
export function ToastHost() {
    const insets = useSafeAreaInsets();
    const [message, setMessage] = useState<string | null>(null);
    const [visibility] = useState(() => new Animated.Value(0));
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => subscribeToast((next) => {
        setMessage(next);
        Animated.timing(visibility, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();

        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            Animated.timing(visibility, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
                if (finished) setMessage(null);
            });
        }, VISIBLE_MS);
    }), [visibility]);

    useEffect(() => () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
    }, []);

    if (!message) return null;

    return (
        <Animated.View
            pointerEvents="none"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[
                styles.toast,
                {
                    bottom: insets.bottom + 24,
                    opacity: visibility,
                    transform: [{ translateY: visibility.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                },
            ]}
        >
            <Ionicons name="cloud-offline-outline" size={20} color={AppColors.error} />
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        alignSelf: 'center',
        maxWidth: '90%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 999,
        backgroundColor: AppColors.surfaceRaised,
        borderWidth: 2,
        borderColor: AppColors.errorBackground,
        // shadow* устарели (в вебе — предупреждение в консоли), boxShadow работает и в вебе, и на телефоне
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.4)',
        elevation: 8,
    },
    text: {
        color: AppColors.text,
        fontSize: 15,
        fontWeight: '700',
        flexShrink: 1,
    },
});
