import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/app-colors';

// Номера страниц: ‹ 1 … 4 5 6 … 10 ›. page — с 0 (как в API), на кнопках — с 1.
// Одна страница — ничего не показываем.
export function Pagination({ page, pageCount, onChange, disabled }: {
    page: number;
    pageCount: number;
    onChange: (page: number) => void;
    disabled?: boolean;
}) {
    if (pageCount <= 1) return null;

    return (
        <View style={styles.row}>
            <PageButton label="Предыдущая страница" disabled={disabled || page === 0} onPress={() => onChange(page - 1)}>
                <Ionicons name="chevron-back" size={18} color={page === 0 ? AppColors.border : AppColors.text} />
            </PageButton>

            {pageNumbers(page, pageCount).map((number, i) => number === null ? (
                <Text key={`gap-${i}`} style={styles.gap}>…</Text>
            ) : (
                <PageButton
                    key={number}
                    label={`Страница ${number + 1}`}
                    current={number === page}
                    disabled={disabled}
                    onPress={() => onChange(number)}
                >
                    <Text style={[styles.number, number === page && styles.numberCurrent]}>{number + 1}</Text>
                </PageButton>
            ))}

            <PageButton
                label="Следующая страница"
                disabled={disabled || page === pageCount - 1}
                onPress={() => onChange(page + 1)}
            >
                <Ionicons name="chevron-forward" size={18} color={page === pageCount - 1 ? AppColors.border : AppColors.text} />
            </PageButton>
        </View>
    );
}

// первая, последняя и соседние с текущей; пропуски — null («…»)
function pageNumbers(page: number, pageCount: number): (number | null)[] {
    const shown = [...new Set([0, page - 1, page, page + 1, pageCount - 1])]
        .filter((n) => n >= 0 && n < pageCount)
        .sort((a, b) => a - b);

    const result: (number | null)[] = [];
    shown.forEach((n, i) => {
        const prev = shown[i - 1];
        if (prev !== undefined && n - prev === 2) result.push(prev + 1); // пропуск в одну страницу — просто её номер
        else if (prev !== undefined && n - prev > 2) result.push(null);
        result.push(n);
    });
    return result;
}

function PageButton({ children, label, current = false, disabled, onPress }: {
    children: React.ReactNode;
    label: string;
    current?: boolean;
    disabled?: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: current, disabled }}
            disabled={disabled || current}
            onPress={onPress}
            style={({ pressed }) => [styles.button, current && styles.buttonCurrent, pressed && styles.pressed]}
        >
            {children}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    button: {
        minWidth: 40,
        height: 40,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: AppColors.border,
        backgroundColor: AppColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonCurrent: {
        borderColor: AppColors.blue,
        backgroundColor: AppColors.blueBackground,
    },
    number: {
        color: AppColors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    numberCurrent: {
        color: AppColors.blue,
    },
    gap: {
        color: AppColors.textSecondary,
        fontSize: 15,
        paddingHorizontal: 2,
    },
    pressed: {
        opacity: 0.6,
    },
});
