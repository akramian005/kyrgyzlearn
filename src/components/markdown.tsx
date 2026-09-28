import { marked, type Token, type Tokens } from 'marked';
import React, { useMemo, type ReactNode } from 'react';
import { Linking, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { AppColors } from '@/constants/app-colors';

// Markdown в тексте уроков (сообщения и вопросы) и в описаниях курсов, уроков и видео: **жирный**, _курсив_, ~~зачёркнутый~~, `код`,
// заголовки #, списки - и 1., цитаты >, ссылки [текст](адрес), разделитель ---.
// marked только разбирает текст на части, а рисуем мы сами обычными Text/View — одинаково на телефоне и в вебе.
// HTML не выполняется: теги показываются как обычный текст.
// Одиночный перенос строки — новая строка (breaks), как в мессенджерах.

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

// описания курса, урока и видео на их экранах — им же рисуется предпросмотр в редакторе
export const DESCRIPTION_TEXT_STYLE: TextStyle = {
    color: AppColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
};

type Props = {
    text: string;
    // базовый стиль текста (размер, цвет, жирность) — заголовки и остальное строятся от него
    style?: StyleProp<TextStyle>;
};

export function Markdown({ text, style }: Props) {
    const blocks = useMemo(() => marked.lexer(text ?? '', { gfm: true, breaks: true }), [text]);
    const base = StyleSheet.flatten([styles.base, style]);

    return <View style={styles.blocks}>{renderBlocks(blocks, base)}</View>;
}

// Текст без разметки — для коротких подписей и подтверждений («Удалить вопрос «…»?»)
export function markdownToPlain(text: string): string {
    // блоки (абзацы, пункты списка) разделяем пробелом, куски одной строки склеиваем как есть
    const plain = (tokens: Token[], separator: string): string => tokens.map((token) => {
        if (token.type === 'list') return (token as Tokens.List).items.map((item) => plain(item.tokens, ' ')).join(' ');
        if ('tokens' in token && token.tokens) return plain(token.tokens, '');
        if (token.type === 'br' || token.type === 'space') return ' ';
        return 'text' in token && typeof token.text === 'string' ? token.text : '';
    }).join(separator);
    return plain(marked.lexer(text ?? '', { gfm: true, breaks: true }), ' ').replace(/\s+/g, ' ').trim();
}

// ---------- Блоки ----------

function renderBlocks(tokens: Token[], base: TextStyle): ReactNode[] {
    return tokens.map((token, i) => renderBlock(token, base, i)).filter((node) => node !== null);
}

function renderBlock(token: Token, base: TextStyle, key: number): ReactNode {
    const size = base.fontSize ?? 16;

    switch (token.type) {
        case 'space':
            return null;

        case 'heading': {
            const heading = token as Tokens.Heading;
            const scale = heading.depth === 1 ? 1.35 : heading.depth === 2 ? 1.2 : 1.08;
            const style = { ...base, fontSize: size * scale, lineHeight: size * scale * 1.3, fontWeight: '800' as const };
            return <Text key={key} style={style}>{renderInline(heading.tokens, style)}</Text>;
        }

        case 'paragraph':
            return <Text key={key} style={base}>{renderInline((token as Tokens.Paragraph).tokens, base)}</Text>;

        // «text» на уровне блока бывает внутри пунктов списка
        case 'text': {
            const t = token as Tokens.Text;
            return <Text key={key} style={base}>{t.tokens ? renderInline(t.tokens, base) : t.text}</Text>;
        }

        case 'list': {
            const list = token as Tokens.List;
            const start = typeof list.start === 'number' ? list.start : 1;
            return (
                <View key={key} style={styles.list}>
                    {list.items.map((item, i) => (
                        <View key={i} style={styles.listItem}>
                            <Text style={[base, styles.bullet, { minWidth: size * (list.ordered ? 1.6 : 1) }]}>
                                {list.ordered ? `${start + i}.` : '•'}
                            </Text>
                            <View style={styles.listContent}>{renderBlocks(item.tokens, base)}</View>
                        </View>
                    ))}
                </View>
            );
        }

        case 'blockquote':
            return (
                <View key={key} style={styles.quote}>
                    {renderBlocks((token as Tokens.Blockquote).tokens, { ...base, color: AppColors.textSecondary })}
                </View>
            );

        case 'code':
            return (
                <View key={key} style={styles.codeBlock}>
                    <Text style={[base, styles.code, { fontSize: size * 0.85, lineHeight: size * 1.2 }]}>
                        {(token as Tokens.Code).text}
                    </Text>
                </View>
            );

        case 'hr':
            return <View key={key} style={styles.hr} />;

        // таблицы, HTML и прочее редкое — как обычный текст, ничего не теряем
        default:
            return 'raw' in token && token.raw.trim()
                ? <Text key={key} style={base}>{token.raw.trim()}</Text>
                : null;
    }
}

// ---------- Внутри строки ----------

function renderInline(tokens: Token[] | undefined, base: TextStyle): ReactNode[] {
    if (!tokens) return [];
    return tokens.map((token, key) => {
        switch (token.type) {
            case 'strong':
                return <Text key={key} style={styles.strong}>{renderInline((token as Tokens.Strong).tokens, base)}</Text>;
            case 'em':
                return <Text key={key} style={styles.em}>{renderInline((token as Tokens.Em).tokens, base)}</Text>;
            case 'del':
                return <Text key={key} style={styles.del}>{renderInline((token as Tokens.Del).tokens, base)}</Text>;
            case 'codespan':
                return (
                    <Text key={key} style={[styles.code, styles.codeSpan, { fontSize: (base.fontSize ?? 16) * 0.9 }]}>
                        {(token as Tokens.Codespan).text}
                    </Text>
                );
            case 'link': {
                const link = token as Tokens.Link;
                return (
                    <Text key={key} style={styles.link} onPress={() => void Linking.openURL(link.href)}>
                        {renderInline(link.tokens, base)}
                    </Text>
                );
            }
            case 'br':
                return '\n';
            case 'text': {
                const t = token as Tokens.Text;
                return t.tokens ? <Text key={key}>{renderInline(t.tokens, base)}</Text> : t.text;
            }
            // escape (\*), html (<b>), image и прочее — исходным текстом
            default:
                return 'text' in token && typeof token.text === 'string' ? token.text : token.raw;
        }
    });
}

const styles = StyleSheet.create({
    base: {
        color: AppColors.text,
        fontSize: 16,
        lineHeight: 22,
    },
    blocks: {
        gap: 8,
        flexShrink: 1,
    },
    list: {
        gap: 4,
    },
    listItem: {
        flexDirection: 'row',
        gap: 6,
    },
    bullet: {
        textAlign: 'right',
    },
    listContent: {
        flex: 1,
        gap: 4,
    },
    quote: {
        borderLeftWidth: 4,
        borderLeftColor: AppColors.blue,
        paddingLeft: 12,
        gap: 6,
    },
    codeBlock: {
        backgroundColor: AppColors.background,
        borderRadius: 10,
        padding: 12,
    },
    code: {
        fontFamily: MONO,
        fontWeight: '400',
    },
    codeSpan: {
        backgroundColor: AppColors.background,
        color: AppColors.accent,
    },
    strong: {
        fontWeight: '800',
    },
    em: {
        fontStyle: 'italic',
    },
    del: {
        textDecorationLine: 'line-through',
    },
    link: {
        color: AppColors.blue,
        textDecorationLine: 'underline',
    },
    hr: {
        height: 2,
        backgroundColor: AppColors.border,
        borderRadius: 1,
    },
});
