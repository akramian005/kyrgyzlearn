import React, { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AuthScreen } from '@/components/auth-screen';
import { ErrorBanner, Button, TextField } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';

export default function SignInScreen() {
    const { signIn } = useSession();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim() || !password) {
            setError('Введите email и пароль');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            // после успешного входа Stack.Protected сам переключит на главный экран
            await signIn(email.trim(), password);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось войти');
            setLoading(false);
        }
    };

    return (
        <AuthScreen title="Вход" subtitle="Продолжите изучение кыргызского">
            <ErrorBanner message={error} />

            <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
            />
            <TextField
                label="Пароль"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={handleSubmit}
            />

            <Button title="Войти" onPress={handleSubmit} loading={loading} />

            <Text style={styles.footer}>
                Нет аккаунта?{' '}
                <Link href="/sign-up" replace style={styles.link}>Зарегистрироваться</Link>
            </Text>
        </AuthScreen>
    );
}

const styles = StyleSheet.create({
    footer: {
        color: AppColors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        marginTop: 24,
    },
    link: {
        color: AppColors.accent,
        fontWeight: '700',
    },
});
