import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';

// Заголовок раскрытой формы редактора с крестиком справа — закрыть, не листая вниз к «Отмене».
// Крестик стоит там же, где у карточки шага была кнопка «Изменить».
export function FormHeader({ title, onClose }: { title: string; onClose: () => void }) {
    return (
        <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <IconButton icon="close" label="Закрыть" onPress={onClose} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        marginRight: -8,
    },
    title: {
        flex: 1,
        color: AppColors.text,
        fontSize: 18,
        fontWeight: '800',
    },
});
