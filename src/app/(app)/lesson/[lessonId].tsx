import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorBanner, IconButton, LoadingView } from '@/components/app-ui';
import { MessageStep } from '@/components/player/message-step';
import { QuestionStep } from '@/components/player/question-step';
import { AppColors } from '@/constants/app-colors';
import { correctAnswerText, isAnswerCorrect } from '@/lib/answers';
import { confirmAsync } from '@/lib/confirm';
import { useApi, useLoader } from '@/lib/hooks';
import type { Lesson, LessonItem } from '@/lib/types';

const PLAYER_MAX_WIDTH = 640;

// Прохождение урока на весь экран, как в Duolingo
export default function LessonPlayerScreen() {
    const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
    const api = useApi();
    const { data: lesson, error, loading } = useLoader(() => api.lessons.get(Number(lessonId)));

    if (loading && !lesson) return <LoadingView />;

    if (!lesson) {
        return (
            <View style={[styles.screen, styles.centered]}>
                <ErrorBanner message={error ?? 'Урок не найден'} />
                <Button title="Назад" variant="secondary" onPress={() => router.back()} />
            </View>
        );
    }

    return <Player key={lesson.id} lesson={lesson} />;
}

function Player({ lesson }: { lesson: Lesson }) {
    const insets = useSafeAreaInsets();
    const total = lesson.items.length;
    const questionCount = lesson.items.filter((item) => item.kind === 'QUESTION').length;

    // очередь шагов: вопрос с ошибкой уходит в конец и повторяется, пока не будет решён
    const [queue, setQueue] = useState<LessonItem[]>(lesson.items);
    const [done, setDone] = useState(0);
    const [stepKey, setStepKey] = useState(0);
    const [selected, setSelected] = useState<number[]>([]);
    const [result, setResult] = useState<boolean | null>(null); // null — ответ ещё не проверен
    const [mistakes, setMistakes] = useState<Set<number>>(() => new Set());

    const current = queue[0];
    const finished = queue.length === 0;

    const progress = useSharedValue(0);
    const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
    useEffect(() => {
        progress.set(withTiming(total === 0 ? 1 : done / total, { duration: 400 }));
    }, [done, total, progress]);

    const shakeX = useSharedValue(0);
    const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

    const restart = () => {
        setQueue(lesson.items);
        setDone(0);
        setSelected([]);
        setResult(null);
        setMistakes(new Set());
        setStepKey((k) => k + 1);
    };

    const footerPadding = { paddingBottom: Math.max(insets.bottom, 12) + 12 };

    // экран итогов возвращаем до функций ниже: они работают с current, а при пустой очереди его нет
    if (finished) {
        const firstTry = questionCount - mistakes.size;
        return (
            <View style={styles.screen}>
                <View style={[styles.centered, styles.flex]}>
                    <Ionicons name="trophy" size={88} color="#FFC800" />
                    <Text style={styles.finishTitle}>Урок пройден!</Text>
                    {questionCount > 0 ? (
                        <Text style={styles.finishText}>
                            С первого раза: {firstTry} из {questionCount}
                        </Text>
                    ) : null}
                </View>
                <View style={[styles.footer, footerPadding]}>
                    <View style={styles.footerInner}>
                        <Button title="Пройти ещё раз" variant="secondary" icon="refresh" onPress={restart} style={styles.flex} />
                        <Button title="Готово" onPress={() => router.back()} style={styles.flex} />
                    </View>
                </View>
            </View>
        );
    }

    const check = () => {
        if (current.kind !== 'QUESTION') return;
        const correct = isAnswerCorrect(current, selected);
        setResult(correct);
        if (!correct) {
            setMistakes((prev) => new Set(prev).add(current.id));
            shakeX.set(withSequence(
                withTiming(-10, { duration: 50 }),
                withTiming(10, { duration: 50 }),
                withTiming(-6, { duration: 50 }),
                withTiming(0, { duration: 50 }),
            ));
        }
    };

    const next = () => {
        if (current.kind === 'MESSAGE' || result === true) {
            setQueue((q) => q.slice(1));
            setDone((d) => d + 1);
        } else {
            setQueue((q) => [...q.slice(1), q[0]]);
        }
        setSelected([]);
        setResult(null);
        setStepKey((k) => k + 1);
    };

    const close = async () => {
        if (done > 0) {
            const leave = await confirmAsync('Выйти из урока?', 'Прогресс этого прохождения не сохранится.', 'Выйти');
            if (!leave) return;
        }
        router.back();
    };

    const answered = result !== null;

    return (
        <View style={styles.screen}>
            <View style={styles.topBar}>
                <IconButton icon="close" label="Закрыть урок" color={AppColors.textSecondary} onPress={close} />
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, progressStyle]} />
                </View>
            </View>

            <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
                <Animated.View key={stepKey} style={[styles.step, shakeStyle]}>
                    {current.kind === 'MESSAGE' ? (
                        <MessageStep message={current} />
                    ) : (
                        <QuestionStep question={current} selected={selected} onChange={setSelected} checked={answered} />
                    )}
                </Animated.View>
            </ScrollView>

            <View
                style={[
                    styles.footer,
                    footerPadding,
                    answered && { backgroundColor: result ? AppColors.accentBackground : AppColors.errorBackground, borderTopColor: 'transparent' },
                ]}
            >
                {answered && current.kind === 'QUESTION' ? (
                    <View style={styles.feedback}>
                        <Ionicons
                            name={result ? 'checkmark-circle' : 'close-circle'}
                            size={32}
                            color={result ? AppColors.success : AppColors.error}
                        />
                        <View style={styles.flex}>
                            <Text style={[styles.feedbackTitle, { color: result ? AppColors.success : AppColors.error }]}>
                                {result ? 'Отлично!' : 'Неправильно'}
                            </Text>
                            {result ? null : (
                                <Text style={styles.feedbackText}>Правильный ответ: {correctAnswerText(current)}</Text>
                            )}
                        </View>
                    </View>
                ) : null}

                <View style={styles.footerInner}>
                    {current.kind === 'QUESTION' && !answered ? (
                        <Button title="Проверить" onPress={check} disabled={selected.length === 0} style={styles.flex} />
                    ) : (
                        <Button
                            title="Продолжить"
                            onPress={next}
                            style={[styles.flex, result === false && styles.wrongButton]}
                        />
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    flex: {
        flex: 1,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        width: '100%',
        maxWidth: PLAYER_MAX_WIDTH + 24,
        alignSelf: 'center',
    },
    progressTrack: {
        flex: 1,
        height: 14,
        borderRadius: 7,
        backgroundColor: AppColors.border,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: AppColors.accent,
        borderRadius: 7,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
    },
    step: {
        width: '100%',
        maxWidth: PLAYER_MAX_WIDTH,
        alignSelf: 'center',
    },
    footer: {
        borderTopWidth: 2,
        borderTopColor: AppColors.border,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    footerInner: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        maxWidth: PLAYER_MAX_WIDTH,
        alignSelf: 'center',
    },
    feedback: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        maxWidth: PLAYER_MAX_WIDTH,
        alignSelf: 'center',
        marginBottom: 14,
    },
    feedbackTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    feedbackText: {
        color: AppColors.error,
        fontSize: 15,
        fontWeight: '600',
        marginTop: 2,
    },
    wrongButton: {
        backgroundColor: AppColors.errorStrong,
        borderColor: AppColors.errorStrong,
    },
    finishTitle: {
        color: AppColors.text,
        fontSize: 28,
        fontWeight: '800',
    },
    finishText: {
        color: AppColors.textSecondary,
        fontSize: 17,
        fontWeight: '600',
    },
});
