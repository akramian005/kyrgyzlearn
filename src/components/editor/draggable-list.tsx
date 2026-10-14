import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppColors } from '@/constants/app-colors';

// сколько держать палец на ручке, прежде чем строка «отклеится» (на ПК мышью — почти сразу)
const LONG_PRESS_MS = Platform.OS === 'web' ? 100 : 200;

type Positions = Record<string, number>;

// Список строк одинаковой высоты, которые переставляются перетаскиванием за ручку ⋮⋮ (шесть точек).
// Строки стоят абсолютно по своей позиции из positions: во время перетаскивания меняются только позиции,
// а новый порядок уходит в onReorder, когда строку отпустили, — так строки не «прыгают».
export function DraggableList<T>({ items, keyOf, rowHeight, onReorder, renderItem }: {
    items: T[];
    keyOf: (item: T) => string;
    rowHeight: number;
    onReorder: (from: number, to: number) => void;
    // handle — ручка для перетаскивания, её нужно поставить в строку
    renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
}) {
    const keys = items.map(keyOf);
    const positions = useSharedValue<Positions>(toPositions(keys));

    // порядок поменялся снаружи (добавили, удалили, стрелки) — выравниваем позиции
    const keysSignature = keys.join('|');
    useEffect(() => {
        positions.set(toPositions(keysSignature ? keysSignature.split('|') : []));
    }, [keysSignature, positions]);

    return (
        <View style={{ height: items.length * rowHeight }}>
            {items.map((item, index) => {
                const key = keyOf(item);
                return (
                    <DraggableRow
                        key={key}
                        id={key}
                        index={index}
                        count={items.length}
                        rowHeight={rowHeight}
                        positions={positions}
                        onReorder={onReorder}
                        render={(handle) => renderItem(item, index, handle)}
                    />
                );
            })}
        </View>
    );
}

function toPositions(keys: string[]): Positions {
    return Object.fromEntries(keys.map((key, index) => [key, index]));
}

function DraggableRow({ id, index, count, rowHeight, positions, onReorder, render }: {
    id: string;
    index: number;
    count: number;
    rowHeight: number;
    positions: SharedValue<Positions>;
    onReorder: (from: number, to: number) => void;
    render: (handle: ReactNode) => ReactNode;
}) {
    const dragging = useSharedValue(false);
    const dragTop = useSharedValue(0);
    const startTop = useSharedValue(0);

    const pan = Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
            startTop.set((positions.get()[id] ?? index) * rowHeight);
            dragTop.set(startTop.get());
            dragging.set(true);
        })
        .onUpdate((e) => {
            const top = Math.min(Math.max(startTop.get() + e.translationY, 0), (count - 1) * rowHeight);
            dragTop.set(top);

            // перетащили через середину соседа — меняемся с ним местами
            const current = positions.get();
            const from = current[id];
            const to = Math.round(top / rowHeight);
            if (to === from) return;
            const next = { ...current };
            for (const key in next) {
                if (next[key] === to) next[key] = from;
            }
            next[id] = to;
            positions.set(next);
        })
        .onFinalize(() => {
            if (!dragging.get()) return;
            const to = positions.get()[id];
            dragTop.set(withTiming(to * rowHeight, { duration: 150 }, () => {
                dragging.set(false);
                if (to !== index) scheduleOnRN(onReorder, index, to);
            }));
        });

    const style = useAnimatedStyle(() => {
        const isDragging = dragging.get();
        return {
            top: isDragging ? dragTop.get() : withTiming((positions.get()[id] ?? index) * rowHeight, { duration: 150 }),
            zIndex: isDragging ? 10 : 0,
            transform: [{ scale: withTiming(isDragging ? 1.02 : 1, { duration: 120 }) }],
            opacity: isDragging ? 0.95 : 1,
        };
    });

    const handle = (
        <GestureDetector gesture={pan}>
            <View accessibilityLabel="Перетащить" style={styles.handle}>
                <MaterialCommunityIcons name="drag-vertical" size={22} color={AppColors.textSecondary} />
            </View>
        </GestureDetector>
    );

    return (
        <Animated.View style={[styles.row, { height: rowHeight }, style]}>
            {render(handle)}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    row: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
    handle: {
        width: 28,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        // на ПК курсор подсказывает, что строку можно тащить
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
});
