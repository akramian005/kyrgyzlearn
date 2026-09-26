import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withSpring,
    Easing,
} from 'react-native-reanimated';

const QUESTION = {
    prompt: 'Как перевести «дом» на английский?',
    options: ['House', 'Dog', 'Tree', 'Car'],
    correctIndex: 0,
};

export default function LessonScreen() {
    const insets = useSafeAreaInsets();

    const [selected, setSelected] = useState<number | null>(null);
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

    // Прогресс-бар
    const progress = useSharedValue(0.35);
    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    // Тряска карточки при ошибке
    const shakeX = useSharedValue(0);
    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    // Всплывающий баннер результата
    const bannerY = useSharedValue(120);
    const bannerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bannerY.value }],
    }));

    const handleSelect = (index: number) => {
        if (status !== 'idle') return;
        setSelected(index);

        const isCorrect = index === QUESTION.correctIndex;
        setStatus(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            progress.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
        } else {
            shakeX.value = withSequence(
                withTiming(-10, { duration: 50 }),
                withTiming(10, { duration: 50 }),
                withTiming(-6, { duration: 50 }),
                withTiming(0, { duration: 50 })
            );
        }

        bannerY.value = withSpring(0, { damping: 14 });
    };

    const reset = () => {
        setSelected(null);
        setStatus('idle');
        bannerY.value = withTiming(120);
    };

    return (
        <View style={styles.container}>
            {/* Прогресс-бар */}
            <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>

            {/* Карточка вопроса */}
            <Animated.View style={[styles.card, cardStyle]}>
                <Text style={styles.prompt}>{QUESTION.prompt}</Text>

                {QUESTION.options.map((opt, i) => {
                    const isSelected = selected === i;
                    const isCorrectOpt = i === QUESTION.correctIndex;
                    const showResult = status !== 'idle';

                    let bg = '#1E1E1E';
                    let border = '#333333';
                    let textColor = '#FFFFFF';

                    if (showResult && isSelected) {
                        bg = status === 'correct' ? '#203A16' : '#3A1818';
                        border = status === 'correct' ? '#58CC02' : '#FF4B4B';
                    } else if (showResult && isCorrectOpt) {
                        bg = '#203A16';
                        border = '#58CC02';
                    }

                    return (
                        <Pressable
                            key={opt}
                            onPress={() => handleSelect(i)}
                            style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                        >
                            <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </Animated.View>

            {/* Баннер результата снизу */}
            {status !== 'idle' && (
                <Animated.View
                    style={[
                        styles.banner,
                        bannerStyle,
                        {
                            backgroundColor: status === 'correct' ? '#203A16' : '#3A1818',
                            paddingBottom: Math.max(insets.bottom + 12, 20),
                        },
                    ]}
                >
                    <Text style={[styles.bannerText, { color: status === 'correct' ? '#70E000' : '#FF6B6B' }]}>
                        {status === 'correct' ? 'Отлично! ✅' : 'Правильный ответ: House'}
                    </Text>
                    <Pressable style={styles.nextBtn} onPress={reset}>
                        <Text style={styles.nextBtnText}>Продолжить</Text>
                    </Pressable>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // 👈 Чёрный/тёмный фон экрана
        paddingHorizontal: 20,
    },
    progressTrack: {
        height: 12,
        borderRadius: 6,
        backgroundColor: '#2A2A2A',
        overflow: 'hidden',
        marginTop: 10,
        marginBottom: 30,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#58CC02',
        borderRadius: 6,
    },
    card: {
        flex: 1,
    },
    prompt: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 24,
        color: '#FFFFFF', // 👈 Белый цвет текста
    },
    option: {
        borderWidth: 2,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    banner: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    bannerText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    nextBtn: {
        backgroundColor: '#58CC02',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    nextBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});