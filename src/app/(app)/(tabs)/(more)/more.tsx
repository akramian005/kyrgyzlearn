import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Card, ErrorBanner, Page, Title } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';

// «Прочее»: разделы, которым не нашлось места в других вкладках (аккаунт и выход — в «Профиле»).
// Блок «Мои курсы» ведёт в конструктор своих курсов, у админа он называется «Официальные курсы»
// и ведёт в конструктор официальных.
export default function MoreScreen() {
    const api = useApi();
    const isAdmin = useSession().session?.role === 'ADMIN';
    // тот же кэш, что у конструктора: число курсов видно сразу
    const { data: courses, error } = useLoader(() => api.courses.list(), 'courses');
    const count = courses?.filter((course) => course.type === (isAdmin ? 'OFFICIAL' : 'USER')).length;

    return (
        <Page>
            <Title>Прочее</Title>
            <ErrorBanner message={error} />

            <Card onPress={() => router.push('/my-courses')} style={styles.link}>
                <View style={styles.icon}>
                    <Ionicons name={isAdmin ? 'shield-checkmark' : 'create'} size={22} color={AppColors.blue} />
                </View>
                <View style={styles.body}>
                    <Text style={styles.title}>{isAdmin ? 'Официальные курсы' : 'Мои курсы'}</Text>
                    <Text style={styles.subtitle}>
                        {count === undefined ? '…' : count === 0 ? 'Создайте первый курс' : coursesLabel(count)}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={AppColors.textSecondary} />
            </Card>
        </Page>
    );
}

function coursesLabel(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} курс`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} курса`;
    return `${count} курсов`;
}

const styles = StyleSheet.create({
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    icon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: AppColors.blueBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: AppColors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    subtitle: {
        color: AppColors.textSecondary,
        fontSize: 14,
    },
});
