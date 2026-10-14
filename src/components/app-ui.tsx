import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import React, { useState, type ComponentProps, type PropsWithChildren, type Ref } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    type StyleProp,
    type TextInputProps,
    type TextStyle,
    type ViewStyle,
} from 'react-native';

import { AppColors } from '@/constants/app-colors';
import { textareaContentHeight } from '@/lib/textarea-height';

// Общие элементы интерфейса — тёмная тема в стиле Duolingo, одинаково на вебе и телефоне

export type IconName = ComponentProps<typeof Ionicons>['name'];

// максимальная ширина контента: на широком экране (веб) форма не растягивается на весь монитор
export const CONTENT_MAX_WIDTH = 760;

// ---------- Каркас экрана ----------

// ref — чтобы экран мог прокрутить себя наверх (например, при смене страницы в поиске)
export function Page({ children, onRefresh, refreshing = false, ref }: PropsWithChildren<{
    onRefresh?: () => void;
    refreshing?: boolean;
    ref?: Ref<ScrollView>;
}>) {
    return (
        <ScrollView
            ref={ref}
            style={styles.page}
            contentContainerStyle={styles.pageContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh
                ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.textSecondary} />
                : undefined}
        >
            <View style={styles.pageInner}>{children}</View>
        </ScrollView>
    );
}

// Назад по истории; если её нет (страницу открыли по ссылке или обновили в браузере) —
// на запасной экран, иначе router.back() ничего не делает и пишет предупреждение GO_BACK
export function goBack(fallback: Href = '/') {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
}

// Шапка вложенных экранов: стрелка назад + заголовок
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerInner}>
                <IconButton icon="arrow-back" onPress={() => goBack()} label="Назад" />
                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                {right}
            </View>
        </View>
    );
}

export function Title({ children }: PropsWithChildren) {
    return <Text style={styles.title}>{children}</Text>;
}

export function SectionTitle({ children }: PropsWithChildren) {
    return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Muted({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
    return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Card({ children, style, onPress }: PropsWithChildren<{
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
}>) {
    if (!onPress) return <View style={[styles.card, style]}>{children}</View>;

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
        >
            {children}
        </Pressable>
    );
}

// ---------- Состояния загрузки ----------

export function LoadingView() {
    return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color={AppColors.accent} />
        </View>
    );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
    return (
        <View style={styles.empty}>
            <Ionicons name={icon} size={40} color={AppColors.textSecondary} />
            <Text style={styles.emptyTitle}>{title}</Text>
            {text ? <Text style={styles.emptyText}>{text}</Text> : null}
        </View>
    );
}

// Экран без данных, потому что сервер недоступен (сама ошибка — во всплывающем уведомлении)
export function OfflineState({ onRetry }: { onRetry: () => void }) {
    return (
        <>
            <EmptyState icon="cloud-offline-outline" title="Нет связи с сервером" text="Проверьте интернет и попробуйте ещё раз" />
            <Button title="Повторить" icon="refresh" variant="secondary" onPress={onRetry} />
        </>
    );
}

export function ErrorBanner({ message }: { message: string | null | undefined }) {
    if (!message) return null;
    return (
        <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{message}</Text>
        </View>
    );
}

// ---------- Поля и кнопки ----------

// у поля ввода рамка 2px с каждой стороны — её нет в scrollHeight, добавляем к высоте
const INPUT_BORDERS = 4;
// Многострочное поле растёт с текстом, но не выше MULTILINE_MAX_LINES строк — дальше текст прокручивается внутри поля
const MULTILINE_LINE_HEIGHT = 22;
const MULTILINE_MAX_LINES = 7;
const MULTILINE_MAX_HEIGHT = MULTILINE_LINE_HEIGHT * MULTILINE_MAX_LINES + 12 * 2 + INPUT_BORDERS; // + отступы и рамка

// у поля пароля (secureTextEntry) справа «глазик» — показать/скрыть вводимый текст.
// У многострочного поля справа ползунок, когда текст не помещается и прокручивается внутри.
export function TextField({ label, multiline, style, secureTextEntry, onChange, onContentSizeChange, onScroll, ...props }: TextInputProps & { label: string }) {
    const [hidden, setHidden] = useState(true);
    // для ползунка: видимая высота поля, полная высота текста и насколько прокручено
    const [visibleHeight, setVisibleHeight] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    // Веб: <textarea> сам не растёт — подгоняем высоту под текст (до MULTILINE_MAX_HEIGHT, как на телефоне).
    // На телефоне многострочное поле растёт само, там высоту не трогаем.
    const autoGrow = multiline && Platform.OS === 'web';
    const [webHeight, setWebHeight] = useState<number | undefined>(undefined);

    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <View>
                <TextInput
                    placeholderTextColor={AppColors.textSecondary}
                    multiline={multiline}
                    secureTextEntry={secureTextEntry && hidden}
                    style={[
                        styles.input,
                        multiline && styles.inputMultiline,
                        secureTextEntry && styles.inputWithToggle,
                        style,
                        autoGrow && webHeight !== undefined ? { height: Math.min(webHeight, MULTILINE_MAX_HEIGHT) } : null,
                    ]}
                    // при первом показе: текст выше поля — растягиваем
                    onLayout={multiline ? (e) => setVisibleHeight(e.nativeEvent.layout.height - INPUT_BORDERS) : props.onLayout}
                    onContentSizeChange={(e) => {
                        if (autoGrow) setWebHeight(e.nativeEvent.contentSize.height + INPUT_BORDERS);
                        // в вебе это scrollHeight: при росте он точный, а при сжатии его уточнит onChange
                        if (multiline) setContentHeight(e.nativeEvent.contentSize.height);
                        onContentSizeChange?.(e);
                    }}
                    onChange={(e) => {
                        // меряем на невидимой копии поля — так поле может и сжаться, и не дёргается
                        if (autoGrow) {
                            const height = textareaContentHeight(e.target as unknown as HTMLTextAreaElement);
                            setWebHeight(height);
                            setContentHeight(height - INPUT_BORDERS);
                        }
                        onChange?.(e);
                    }}
                    onScroll={(e) => {
                        // телефон присылает contentOffset, веб — обычное событие прокрутки <textarea>
                        if (multiline) {
                            setScrollY(e.nativeEvent.contentOffset?.y ?? (e.target as unknown as HTMLTextAreaElement).scrollTop ?? 0);
                        }
                        onScroll?.(e);
                    }}
                    {...props}
                />
                {multiline ? <ScrollThumb visible={visibleHeight} content={contentHeight} offset={scrollY} /> : null}
                {secureTextEntry ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={hidden ? 'Показать пароль' : 'Скрыть пароль'}
                        onPress={() => setHidden((value) => !value)}
                        hitSlop={6}
                        style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
                    >
                        <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={AppColors.textSecondary} />
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}

// Ползунок прокрутки многострочного поля: свой, а не системный — на телефоне системный виден
// только во время прокрутки, а этот показывает всегда, что текст длиннее поля и где вы сейчас.
const THUMB_INSET = 6;
const THUMB_MIN = 24;

function ScrollThumb({ visible, content, offset }: { visible: number; content: number; offset: number }) {
    if (visible <= 0 || content <= visible + 1) return null;
    const track = visible - THUMB_INSET * 2;
    const length = Math.max(THUMB_MIN, (track * visible) / content);
    const progress = Math.min(Math.max(offset / (content - visible), 0), 1);
    return (
        <View
            pointerEvents="none"
            style={[styles.scrollThumb, { height: length, top: INPUT_BORDERS / 2 + THUMB_INSET + (track - length) * progress }]}
        />
    );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon, small, style }: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: ButtonVariant;
    icon?: IconName;
    small?: boolean;
    style?: StyleProp<ViewStyle>;
}) {
    const inactive = loading || disabled;
    const textColor = variant === 'primary' ? '#fff' : variant === 'danger' ? AppColors.error : AppColors.text;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: inactive }}
            onPress={onPress}
            disabled={inactive}
            style={({ pressed }) => [
                styles.button,
                styles[`button_${variant}`],
                small && styles.buttonSmall,
                (pressed || inactive) && styles.pressed,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <>
                    {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={textColor} /> : null}
                    <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: textColor }]}>{title}</Text>
                </>
            )}
        </Pressable>
    );
}

export function IconButton({ icon, onPress, label, color = AppColors.text, disabled }: {
    icon: IconName;
    onPress: () => void;
    label: string;
    color?: string;
    disabled?: boolean;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            disabled={disabled}
            hitSlop={6}
            style={({ pressed }) => [styles.iconButton, (pressed || disabled) && styles.pressed]}
        >
            <Ionicons name={icon} size={22} color={disabled ? AppColors.border : color} />
        </Pressable>
    );
}

// Выбор одного значения из нескольких (тип вопроса и т.п.)
export function Segmented<T extends string>({ value, options, onChange }: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <View style={styles.segmented}>
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => onChange(option.value)}
                        style={[styles.segment, selected && styles.segmentSelected]}
                    >
                        <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export function Badge({ label, color = AppColors.accent }: { label: string; color?: string }) {
    return (
        <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    pageContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 48,
    },
    pageInner: {
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        alignSelf: 'center',
    },
    header: {
        backgroundColor: AppColors.background,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH + 16,
        alignSelf: 'center',
    },
    headerTitle: {
        flex: 1,
        color: AppColors.text,
        fontSize: 18,
        fontWeight: '700',
    },
    title: {
        color: AppColors.text,
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 16,
    },
    sectionTitle: {
        color: AppColors.text,
        fontSize: 18,
        fontWeight: '800',
        marginTop: 24,
        marginBottom: 12,
    },
    muted: {
        color: AppColors.textSecondary,
        fontSize: 14,
    },
    card: {
        backgroundColor: AppColors.surface,
        borderColor: AppColors.border,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    cardPressed: {
        transform: [{ translateY: 2 }],
        borderBottomWidth: 2,
        marginBottom: 14,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AppColors.background,
        padding: 24,
    },
    empty: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
        gap: 8,
    },
    emptyTitle: {
        color: AppColors.text,
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyText: {
        color: AppColors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
    },
    errorBanner: {
        backgroundColor: AppColors.errorBackground,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: AppColors.error,
        fontSize: 14,
        fontWeight: '600',
    },
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
        backgroundColor: AppColors.surface,
        borderColor: AppColors.border,
        borderWidth: 2,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: AppColors.text,
        fontSize: 16,
    },
    inputMultiline: {
        minHeight: 90,
        lineHeight: MULTILINE_LINE_HEIGHT,
        // дальше 7 строк поле не растёт — текст прокручивается внутри
        maxHeight: MULTILINE_MAX_HEIGHT,
        textAlignVertical: 'top',
    },
    scrollThumb: {
        position: 'absolute',
        right: 6,
        width: 4,
        borderRadius: 2,
        backgroundColor: AppColors.textSecondary,
        opacity: 0.7,
    },
    inputWithToggle: {
        paddingRight: 52, // место под «глазик», чтобы текст под него не заезжал
    },
    passwordToggle: {
        position: 'absolute',
        right: 6,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    button: {
        flexDirection: 'row',
        gap: 8,
        borderRadius: 12,
        paddingVertical: 13,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        borderWidth: 2,
    },
    button_primary: {
        backgroundColor: AppColors.accent,
        borderColor: AppColors.accent,
    },
    button_secondary: {
        backgroundColor: AppColors.surface,
        borderColor: AppColors.border,
    },
    button_danger: {
        backgroundColor: 'transparent',
        borderColor: AppColors.errorBackground,
    },
    // «Отмена»: без заливки, но с серой рамкой — чтобы было видно границы кнопки
    button_ghost: {
        backgroundColor: 'transparent',
        borderColor: AppColors.border,
    },
    buttonSmall: {
        minHeight: 36,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    buttonText: {
        fontWeight: '700',
        fontSize: 16,
    },
    buttonTextSmall: {
        fontSize: 14,
    },
    pressed: {
        opacity: 0.6,
    },
    iconButton: {
        padding: 8,
        borderRadius: 10,
    },
    segmented: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    segment: {
        borderWidth: 2,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: AppColors.surface,
    },
    segmentSelected: {
        borderColor: AppColors.blue,
        backgroundColor: AppColors.blueBackground,
    },
    segmentText: {
        color: AppColors.textSecondary,
        fontWeight: '700',
        fontSize: 14,
    },
    segmentTextSelected: {
        color: AppColors.blue,
    },
    badge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});
