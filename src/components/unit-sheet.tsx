import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, IconButton } from '@/components/app-ui';
import { isItemDone, isPlayable } from '@/components/unit-path';
import { AppColors } from '@/constants/app-colors';
import type { CourseItem, Unit } from '@/lib/types';

// какой урок или видео показать при открытии: следующий после пройденных (первый непройденный),
// а если пройдено всё — первый
function defaultIndex(items: CourseItem[]): number {
    const next = items.findIndex((item) => isPlayable(item) && !isItemDone(item));
    return next >= 0 ? next : 0;
}

// Окно юнита под его кружком (см. UnitPath): название, «Урок 4 из 5» со стрелками для выбора урока
// или видео и кнопка «Старт». Остальной экран не затемняется
export function UnitPopover({ unit, number, courseId, onClose }: {
    unit: Unit;
    number: number;
    courseId: number;
    onClose: () => void;
}) {
    return (
        <View style={styles.card}>
            <UnitPopoverContent key={unit.id} unit={unit} number={number} courseId={courseId} onClose={onClose} />
        </View>
    );
}

function UnitPopoverContent({ unit, number, courseId, onClose }: {
    unit: Unit;
    number: number;
    courseId: number;
    onClose: () => void;
}) {
    const [index, setIndex] = useState(() => defaultIndex(unit.items));
    const item = unit.items[index];
    const count = unit.items.length;

    const start = () => {
        if (!item) return;
        onClose();
        if (item.kind === 'LESSON') {
            router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: item.id } });
        } else {
            router.push({ pathname: '/video/[videoId]', params: { videoId: item.id, courseId } });
        }
    };

    return (
        <>
            {/* название и крестик в одну строку */}
            <View style={styles.header}>
                <Text style={styles.title} accessibilityLabel={`Юнит ${number}: ${unit.title}`}>{unit.title}</Text>
                <IconButton icon="close" label="Закрыть" onPress={onClose} />
            </View>

            {item ? (
                <>
                    <View style={styles.switcher}>
                        <IconButton icon="chevron-back" label="Предыдущий" onPress={() => setIndex(index - 1)} disabled={index === 0} />
                        <View style={styles.current}>
                            <Text style={styles.position}>
                                {item.kind === 'LESSON' ? 'Урок' : 'Видео'} {index + 1} из {count}
                            </Text>
                            {item.kind === 'VIDEO' ? <Text style={styles.videoTitle} numberOfLines={1}>{item.title}</Text> : null}
                            <ItemStatus item={item} />
                        </View>
                        <IconButton icon="chevron-forward" label="Следующий" onPress={() => setIndex(index + 1)} disabled={index === count - 1} />
                    </View>
                    <Button title="Старт" icon="play" onPress={start} disabled={!isPlayable(item)} />
                </>
            ) : (
                <Text style={styles.empty}>В этом юните пока нет уроков</Text>
            )}
        </>
    );
}

function ItemStatus({ item }: { item: CourseItem }) {
    if (!isPlayable(item)) {
        return <Text style={styles.status}>{item.kind === 'LESSON' ? 'Урок пока пустой' : 'Видео ещё не загружено'}</Text>;
    }
    if (isItemDone(item)) {
        return (
            <View style={styles.doneRow}>
                <Ionicons name="checkmark-circle" size={16} color={AppColors.blue} />
                <Text style={[styles.status, styles.done]}>{item.kind === 'LESSON' ? 'Пройден' : 'Просмотрено'}</Text>
            </View>
        );
    }
    return null;
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: AppColors.surface,
        borderColor: AppColors.blue,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderRadius: 20,
        padding: 20,
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: -6,
        marginRight: -8,
    },
    title: {
        flex: 1,
        color: AppColors.text,
        fontSize: 22,
        fontWeight: '800',
    },
    switcher: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppColors.background,
        borderRadius: 14,
        paddingVertical: 10,
    },
    current: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    position: {
        color: AppColors.text,
        fontSize: 18,
        fontWeight: '800',
    },
    videoTitle: {
        color: AppColors.textSecondary,
        fontSize: 14,
    },
    status: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    doneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    done: {
        color: AppColors.blue,
    },
    empty: {
        color: AppColors.textSecondary,
        fontSize: 15,
    },
});
