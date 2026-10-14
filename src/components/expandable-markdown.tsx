import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type TextStyle } from 'react-native';

import { Markdown } from '@/components/markdown';
import { AppColors } from '@/constants/app-colors';

// Длинный Markdown-текст (описание курса): свёрнут до lines строк, справа от текста — синяя кнопка
// с тетрадкой: раскрыть / свернуть.
// Короткий текст, который и так помещается, показывается целиком и без кнопки.
export function ExpandableMarkdown({ text, style, lines = 3 }: { text: string; style: TextStyle; lines?: number }) {
    const [expanded, setExpanded] = useState(false);
    const [fullHeight, setFullHeight] = useState(0);

    const collapsedHeight = (style.lineHeight ?? (style.fontSize ?? 16) * 1.4) * lines;
    // +1 — запас на дробные пиксели при измерении
    const overflows = fullHeight > collapsedHeight + 1;

    return (
        <View style={styles.row}>
            <View style={[styles.clip, !expanded && { maxHeight: collapsedHeight }]}>
                {/* внутренний блок не ограничен по высоте — onLayout даёт полную высоту текста */}
                <View onLayout={(e) => setFullHeight(e.nativeEvent.layout.height)}>
                    <Markdown text={text} style={style} />
                </View>
            </View>

            {overflows ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={expanded ? 'Свернуть описание' : 'Читать описание полностью'}
                    accessibilityState={{ expanded }}
                    onPress={() => setExpanded((value) => !value)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.toggle, expanded && styles.toggleExpanded, pressed && styles.pressed]}
                >
                    <Ionicons name={expanded ? 'journal' : 'journal-outline'} size={20} color={expanded ? AppColors.blue : '#fff'} />
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    // текст слева, кнопка справа на уровне первой строки
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    clip: {
        flex: 1,
        overflow: 'hidden',
    },
    toggle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: AppColors.blue,
        backgroundColor: AppColors.blue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // раскрыто — та же кнопка, но тёмная с синей рамкой: видно, что описание открыто
    toggleExpanded: {
        backgroundColor: AppColors.blueBackground,
    },
    pressed: {
        opacity: 0.6,
    },
});
