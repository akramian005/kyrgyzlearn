import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/app-colors';
import type { CourseItem, Unit } from '@/lib/types';

// «Змейка» юнитов на экране курса: кружки идут вниз и уходят в стороны —
// по середине, левее, ещё левее, обратно, по середине, вправо, ещё правее, обратно, снова влево…
const SNAKE = [0, -1, -2, -1, 0, 1, 2, 1];
const SNAKE_STEP = 52;

const RING_SIZE = 92;
const RING_THICKNESS = 6;
const CIRCLE_SIZE = 72;

export type UnitStatus = 'done' | 'progress' | 'idle';

// урок без шагов и видео без файла пройти нельзя — в прогрессе юнита они не считаются (как и на бэкенде)
export function isPlayable(item: CourseItem): boolean {
    return item.kind === 'LESSON' ? item.itemCount > 0 : item.videoUrl !== null;
}

export function isItemDone(item: CourseItem): boolean {
    return item.kind === 'LESSON' ? item.completed : item.watched;
}

export function unitProgress(unit: Unit): { done: number; total: number; status: UnitStatus } {
    const playable = unit.items.filter(isPlayable);
    const done = playable.filter(isItemDone).length;
    const total = playable.length;
    const status: UnitStatus = total > 0 && done === total ? 'done' : done > 0 ? 'progress' : 'idle';
    return { done, total, status };
}

// пройден — голубой, начат — жёлтый, не начат — серый
const STATUS_COLORS: Record<UnitStatus, { fill: string; shade: string; ring: string; text: string }> = {
    done: { fill: AppColors.blue, shade: '#1385BB', ring: AppColors.blue, text: '#fff' },
    progress: { fill: AppColors.gold, shade: '#C99E00', ring: AppColors.gold, text: '#3A2E00' },
    idle: { fill: AppColors.surfaceRaised, shade: AppColors.border, ring: AppColors.border, text: AppColors.textSecondary },
};

// openUnitId — юнит, под кружком которого открыто окно (renderPopover); окно ничего не затемняет
// и лежит поверх кружков ниже, а сама змейка не сдвигается
export function UnitPath({ units, openUnitId, onPress, renderPopover }: {
    units: Unit[];
    openUnitId: number | null;
    onPress: (unit: Unit) => void;
    renderPopover: (unit: Unit, number: number) => ReactNode;
}) {
    return (
        <View style={[styles.path, openUnitId !== null && styles.pathWithPopover]}>
            {units.map((unit, index) => {
                const offset = SNAKE[index % SNAKE.length] * SNAKE_STEP;
                const open = unit.id === openUnitId;
                return (
                    <View key={unit.id} style={[styles.nodeSlot, open && styles.nodeSlotOpen]}>
                        <View style={{ transform: [{ translateX: offset }] }}>
                            <UnitNode unit={unit} number={index + 1} onPress={() => onPress(unit)} />
                        </View>
                        {open ? (
                            // окно по центру экрана, а стрелка сверху смотрит на кружок, сдвинутый змейкой
                            <View style={styles.popover}>
                                <View style={[styles.popoverArrow, { transform: [{ translateX: offset }, { rotate: '45deg' }] }]} />
                                {renderPopover(unit, index + 1)}
                            </View>
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
}

// Кружок юнита с номером; вокруг — кольцо, которое по мере прохождения уроков заполняется по кругу
function UnitNode({ unit, number, onPress }: { unit: Unit; number: number; onPress: () => void }) {
    const { done, total, status } = unitProgress(unit);
    const colors = STATUS_COLORS[status];

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Юнит ${number}: ${unit.title}, пройдено ${done} из ${total}`}
            onPress={onPress}
            style={({ pressed }) => [styles.node, pressed && styles.pressed]}
        >
            <ProgressRing progress={total > 0 ? done / total : 0} color={colors.ring} />
            <View style={[styles.circle, { backgroundColor: colors.fill, borderBottomColor: colors.shade }]}>
                <Text style={[styles.number, { color: colors.text }]}>{number}</Text>
            </View>
        </Pressable>
    );
}

// Кольцо прогресса без SVG: серая дорожка и две половинки цветного кольца, каждая видна только в своей
// половине (overflow: hidden) и поворачивается на нужный угол. Правая половина заполняет 0–180°, левая — 180–360°.
function ProgressRing({ progress, color }: { progress: number; color: string }) {
    const degrees = Math.max(0, Math.min(1, progress)) * 360;
    const right = Math.min(degrees, 180);
    const left = Math.max(degrees - 180, 0);

    return (
        <View style={styles.ring}>
            <View style={[styles.ringCircle, { borderColor: AppColors.border }]} />
            {degrees > 0 ? (
                <>
                    <View style={[styles.half, styles.halfRight]}>
                        {/* цветные левая и нижняя стороны рамки — полукруг; +45° ставит его ровно в левую половину */}
                        <View style={[styles.ringCircle, styles.halfArc, { borderLeftColor: color, borderBottomColor: color, left: -RING_SIZE / 2, transform: [{ rotate: `${45 + right}deg` }] }]} />
                    </View>
                    {left > 0 ? (
                        <View style={[styles.half, styles.halfLeft]}>
                            <View style={[styles.ringCircle, styles.halfArc, { borderLeftColor: color, borderBottomColor: color, transform: [{ rotate: `${225 + left}deg` }] }]} />
                        </View>
                    ) : null}
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    path: {
        alignItems: 'center',
        gap: 18,
        paddingVertical: 16,
    },
    // окно у последнего кружка не должно уходить за конец прокрутки
    pathWithPopover: {
        paddingBottom: 260,
    },
    nodeSlot: {
        width: '100%',
        alignItems: 'center',
    },
    // открытый юнит — поверх следующих, чтобы окно их перекрывало
    nodeSlotOpen: {
        zIndex: 10,
        elevation: 10,
    },
    popover: {
        position: 'absolute',
        top: RING_SIZE + 10,
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
    },
    popoverArrow: {
        width: 18,
        height: 18,
        marginBottom: -11,
        backgroundColor: AppColors.surface,
        borderColor: AppColors.blue,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        zIndex: 1,
    },
    node: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.8,
        transform: [{ translateY: 2 }],
    },
    circle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        borderBottomWidth: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    number: {
        fontSize: 28,
        fontWeight: '800',
    },
    ring: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: RING_SIZE,
        height: RING_SIZE,
    },
    ringCircle: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        borderWidth: RING_THICKNESS,
    },
    halfArc: {
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
    },
    half: {
        position: 'absolute',
        top: 0,
        width: RING_SIZE / 2,
        height: RING_SIZE,
        overflow: 'hidden',
    },
    halfRight: {
        left: RING_SIZE / 2,
    },
    halfLeft: {
        left: 0,
    },
});
