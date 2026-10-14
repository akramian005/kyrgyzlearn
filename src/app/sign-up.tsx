import React, { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useSession } from '@/auth/session';
import { AuthScreen } from '@/components/auth-screen';
import { ErrorBanner, Button, TextField } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { isConnectionError } from '@/lib/api';
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, validateEmail, validateName, validateNewPassword } from '@/lib/validation';

function validate(name: string, email: string, password: string, passwordRepeat: string): string | null {
    return validateName(name) ?? validateEmail(email) ?? validateNewPassword(password, passwordRepeat);
}

export default function SignUpScreen() {
    const { signUp } = useSession();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordRepeat, setPasswordRepeat] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const validationError = validate(name.trim(), email.trim(), password, passwordRepeat);
        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await signUp(name.trim(), email.trim(), password);
        } catch (e) {
            // о потере связи уже сообщило всплывающее уведомление
            setError(isConnectionError(e) ? null : e instanceof Error ? e.message : 'Не удалось зарегистрироваться');
            setLoading(false);
        }
    };

    return (
        <AuthScreen title="Регистрация" subtitle="Создайте аккаунт, чтобы сохранять прогресс">
            <ErrorBanner message={error} />

            <TextField
                label="Имя"
                value={name}
                onChangeText={setName}
                placeholder="Как к вам обращаться"
                autoComplete="name"
                textContentType="name"
                maxLength={MAX_NAME_LENGTH}
            />
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
                placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
            />
            <TextField
                label="Повторите пароль"
                value={passwordRepeat}
                onChangeText={setPasswordRepeat}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={handleSubmit}
            />

            <Button title="Зарегистрироваться" onPress={handleSubmit} loading={loading} />

            <Text style={styles.footer}>
                Уже есть аккаунт?{' '}
                <Link href="/sign-in" replace style={styles.link}>Войти</Link>
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
