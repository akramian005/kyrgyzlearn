import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AudioButton } from '@/components/audio-button';
import { Card, IconButton } from '@/components/app-ui';
import { Markdown } from '@/components/markdown';
import { AppColors } from '@/constants/app-colors';
import { QUESTION_TYPE_LABELS, type LessonItem, type Question } from '@/lib/types';

// Карточка шага урока в редакторе: вопрос с вариантами или сообщение, плюс кнопки управления
export function ItemCard({ item, isFirst, isLast, onEdit, onDelete, onMove }: {
    item: LessonItem;
    isFirst: boolean;
    isLast: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onMove: (delta: -1 | 1) => void;
}) {
    const isQuestion = item.kind === 'QUESTION';

    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                <View style={[styles.kindIcon, { backgroundColor: isQuestion ? AppColors.accentBackground : AppColors.blueBackground }]}>
                    <Ionicons
                        name={isQuestion ? 'help' : 'chatbubble-ellipses'}
                        size={16}
                        color={isQuestion ? AppColors.accent : AppColors.blue}
                    />
                </View>
                <Text style={styles.kindText}>
                    {isQuestion ? `Вопрос · ${QUESTION_TYPE_LABELS[item.type]}` : 'Сообщение'}
                </Text>

                <View style={styles.actions}>
                    <IconButton icon="arrow-up" label="Выше" onPress={() => onMove(-1)} disabled={isFirst} />
                    <IconButton icon="arrow-down" label="Ниже" onPress={() => onMove(1)} disabled={isLast} />
                    <IconButton icon="create-outline" label="Изменить" color={AppColors.blue} onPress={onEdit} />
                    <IconButton icon="trash-outline" label="Удалить" color={AppColors.error} onPress={onDelete} />
                </View>
            </View>

            <Markdown text={item.text} style={styles.text} />

            {item.kind === 'QUESTION' ? <OptionsPreview question={item} /> : null}

            {item.kind === 'MESSAGE' && item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
            ) : null}

            {item.audioUrl ? (
                <View style={styles.audio}>
                    <AudioButton key={item.audioUrl} url={item.audioUrl} />
                </View>
            ) : null}
        </Card>
    );
}

function OptionsPreview({ question }: { question: Question }) {
    if (question.type === 'ORDER') {
        const answer = question.options
            .filter((option) => option.correctPosition !== null)
            .sort((a, b) => a.correctPosition! - b.correctPosition!);
        const extra = question.options.filter((option) => option.correctPosition === null);

        return (
            <View style={styles.options}>
                <Text style={styles.orderAnswer}>
                    <Text style={styles.optionLabel}>Ответ: </Text>
                    {answer.map((option) => option.text).join(' → ') || '—'}
                </Text>
                {extra.length > 0 ? (
                    <Text style={styles.optionMuted}>Лишние: {extra.map((option) => option.text).join(', ')}</Text>
                ) : null}
            </View>
        );
    }

    return (
        <View style={styles.options}>
            {question.options.map((option) => (
                <View key={option.id} style={styles.optionRow}>
                    <Ionicons
                        name={option.correct ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={option.correct ? AppColors.accent : AppColors.textSecondary}
                    />
                    <Text style={option.correct ? styles.optionCorrect : styles.optionMuted}>{option.text}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    kindIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    kindText: {
        flex: 1,
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        marginRight: -8,
    },
    text: {
        color: AppColors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    options: {
        marginTop: 10,
        gap: 4,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    optionLabel: {
        color: AppColors.textSecondary,
    },
    optionCorrect: {
        color: AppColors.accent,
        fontSize: 15,
        fontWeight: '600',
    },
    optionMuted: {
        color: AppColors.textSecondary,
        fontSize: 15,
    },
    orderAnswer: {
        color: AppColors.accent,
        fontSize: 15,
        fontWeight: '600',
    },
    image: {
        width: '100%',
        maxWidth: 320,
        aspectRatio: 4 / 3,
        borderRadius: 12,
        marginTop: 10,
        backgroundColor: AppColors.surfaceRaised,
    },
    audio: {
        marginTop: 10,
    },
});
