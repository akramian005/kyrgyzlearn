import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { Muted, TextField } from '@/components/app-ui';
import { Markdown } from '@/components/markdown';
import { AppColors } from '@/constants/app-colors';

type Selection = { start: number; end: number };

type Tool = {
    label: string;
    title: string; // подсказка для скринридера
    labelStyle?: StyleProp<TextStyle>;
    apply: (text: string, selection: Selection) => string;
};

// Кнопки оборачивают выделенный текст (**жирный**) или ставят маркер в начало выделенных строк (- список).
// Без выделения вставляется образец, который остаётся заменить своим текстом.
const TOOLS: Tool[] = [
    { label: 'B', title: 'Жирный', labelStyle: { fontWeight: '900' }, apply: (t, s) => wrap(t, s, '**', 'жирный') },
    { label: 'I', title: 'Курсив', labelStyle: { fontStyle: 'italic' }, apply: (t, s) => wrap(t, s, '_', 'курсив') },
    { label: 'S', title: 'Зачёркнутый', labelStyle: { textDecorationLine: 'line-through' }, apply: (t, s) => wrap(t, s, '~~', 'текст') },
    { label: 'H', title: 'Заголовок', apply: (t, s) => prefixLines(t, s, () => '## ') },
    { label: '•', title: 'Список', apply: (t, s) => prefixLines(t, s, () => '- ') },
    { label: '1.', title: 'Нумерованный список', apply: (t, s) => prefixLines(t, s, (i) => `${i + 1}. `) },
    { label: '❝', title: 'Цитата', apply: (t, s) => prefixLines(t, s, () => '> ') },
    { label: '</>', title: 'Код', apply: (t, s) => wrap(t, s, '`', 'код') },
];

// Многострочное поле с Markdown для текста уроков: панель форматирования и предпросмотр
// в том виде, в каком текст увидит ученик (компонент Markdown).
export function MarkdownField({ label, value, onChangeText, placeholder, previewStyle }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    // стиль текста в предпросмотре — как в уроке
    previewStyle?: StyleProp<TextStyle>;
}) {
    const selection = useRef<Selection>({ start: value.length, end: value.length });
    const [preview, setPreview] = useState(false);

    const apply = (tool: Tool) => {
        // выделение могло «устареть», если текст поменяли снаружи
        const s = {
            start: Math.min(selection.current.start, value.length),
            end: Math.min(selection.current.end, value.length),
        };
        onChangeText(tool.apply(value, s));
    };

    return (
        <View style={styles.field}>
            {preview ? (
                <>
                    <Text style={styles.label}>{label}</Text>
                    <View style={styles.preview}>
                        {value.trim()
                            ? <Markdown text={value} style={previewStyle} />
                            : <Muted>Пока пусто</Muted>}
                    </View>
                </>
            ) : (
                <TextField
                    label={label}
                    value={value}
                    onChangeText={onChangeText}
                    onSelectionChange={(e) => {
                        selection.current = e.nativeEvent.selection;
                    }}
                    placeholder={placeholder}
                    multiline
                    style={styles.input}
                />
            )}

            <View style={[styles.toolbar, preview && styles.toolbarUnderPreview]}>
                {preview ? null : TOOLS.map((tool) => (
                    <Pressable
                        key={tool.title}
                        accessibilityRole="button"
                        accessibilityLabel={tool.title}
                        onPress={() => apply(tool)}
                        style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
                    >
                        <Text style={[styles.toolLabel, tool.labelStyle]}>{tool.label}</Text>
                    </Pressable>
                ))}
                <Pressable
                    accessibilityRole="button"
                    onPress={() => setPreview((p) => !p)}
                    style={({ pressed }) => [styles.tool, styles.previewToggle, preview && styles.previewToggleActive, pressed && styles.pressed]}
                >
                    <Text style={[styles.toolLabel, preview && styles.previewToggleText]}>
                        {preview ? 'Редактировать' : 'Просмотр'}
                    </Text>
                </Pressable>
            </View>

            {preview ? null : (
                <Muted style={styles.hint}>
                    Markdown: **жирный**, _курсив_, # заголовок, - список, &gt; цитата, [ссылка](https://…)
                </Muted>
            )}
        </View>
    );
}

// ---------- Вставка разметки ----------

function wrap(text: string, { start, end }: Selection, marker: string, sample: string): string {
    const selected = text.slice(start, end) || sample;
    return text.slice(0, start) + marker + selected + marker + text.slice(end);
}

// маркер в начало каждой строки, которую задевает выделение (или курсор)
function prefixLines(text: string, { start, end }: Selection, prefix: (index: number) => string): string {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = text.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? text.length : nextBreak;
    const lines = text.slice(lineStart, lineEnd).split('\n').map((line, i) => prefix(i) + line);
    return text.slice(0, lineStart) + lines.join('\n') + text.slice(lineEnd);
}

const styles = StyleSheet.create({
    field: {
        marginBottom: 16,
    },
    label: {
        color: AppColors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        minHeight: 120,
    },
    preview: {
        minHeight: 120,
        backgroundColor: AppColors.surface,
        borderColor: AppColors.blue,
        borderWidth: 2,
        borderRadius: 14,
        padding: 16,
    },
    toolbar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        // TextField даёт свой отступ снизу — подтягиваем панель к полю
        marginTop: -8,
    },
    toolbarUnderPreview: {
        marginTop: 8,
    },
    tool: {
        minWidth: 36,
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: AppColors.border,
        backgroundColor: AppColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolLabel: {
        color: AppColors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    previewToggle: {
        marginLeft: 'auto',
    },
    previewToggleActive: {
        borderColor: AppColors.blue,
        backgroundColor: AppColors.blueBackground,
    },
    previewToggleText: {
        color: AppColors.blue,
    },
    pressed: {
        opacity: 0.6,
    },
    hint: {
        marginTop: 6,
        fontSize: 12,
    },
});
