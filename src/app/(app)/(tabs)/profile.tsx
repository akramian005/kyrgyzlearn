import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Avatar } from '@/components/avatar';
import { Badge, Button, Card, ErrorBanner, LoadingView, Page, SectionTitle, TextField, Title } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { ApiError } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { pickFile } from '@/lib/files';
import { errorMessage, useApi, useLoader } from '@/lib/hooks';
import type { UserProfile } from '@/lib/types';
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, validateEmail, validateName, validateNewPassword } from '@/lib/validation';

// «Профиль»: аватар, имя, почта, пароль и выход из аккаунта
export default function ProfileScreen() {
    const { session, signOut } = useSession();
    const api = useApi();
    const { data: profile, error, loading, reload, setData } = useLoader(() => api.profile.get());

    const logout = async () => {
        if (await confirmAsync('Выйти из аккаунта?', 'Чтобы вернуться, нужно будет снова ввести email и пароль', 'Выйти')) {
            signOut();
        }
    };

    if (loading && !profile) return <LoadingView />;

    const name = profile?.name ?? session?.name ?? '';
    const email = profile?.email ?? session?.email ?? '';
    const isAdmin = (profile?.role ?? session?.role) === 'ADMIN';

    return (
        <Page onRefresh={reload}>
            <Title>Профиль</Title>

            <ErrorBanner message={error} />

            <Card style={styles.header}>
                <Avatar url={profile?.avatarUrl} name={name || email} />
                <View style={styles.headerInfo}>
                    <Text style={styles.name} numberOfLines={1}>{name || 'Без имени'}</Text>
                    <Text style={styles.email} numberOfLines={1}>{email}</Text>
                    {isAdmin ? <Badge label="Админ" /> : <Badge label="Ученик" color={AppColors.blue} />}
                </View>
            </Card>

            {profile ? (
                <>
                    <AvatarSection profile={profile} onChange={setData} />
                    <NameForm profile={profile} onChange={setData} />
                    <EmailForm profile={profile} onChange={setData} />
                    <PasswordForm />
                </>
            ) : null}

            <Button title="Выйти" icon="log-out-outline" variant="danger" onPress={logout} style={styles.logout} />
        </Page>
    );
}

type SectionProps = {
    profile: UserProfile;
    onChange: (profile: UserProfile) => void;
};

// ---------- Аватар ----------

// файл загружается сразу после выбора — отдельной кнопки «Сохранить» нет
function AvatarSection({ profile, onChange }: SectionProps) {
    const api = useApi();
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const choose = async () => {
        const picked = await pickFile('image');
        if (!picked) return;

        setError(null);
        setBusy(true);
        try {
            const avatarUrl = await api.profile.uploadAvatar(picked);
            onChange({ ...profile, avatarUrl });
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!(await confirmAsync('Удалить фото?', 'Вместо него будет показана первая буква имени'))) return;

        setError(null);
        setBusy(true);
        try {
            await api.profile.removeAvatar();
            onChange({ ...profile, avatarUrl: null });
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <SectionTitle>Фото</SectionTitle>
            <ErrorBanner message={error} />
            <View style={styles.buttons}>
                <Button
                    title={profile.avatarUrl ? 'Сменить фото' : 'Загрузить фото'}
                    icon="image-outline"
                    variant="secondary"
                    small
                    loading={busy}
                    onPress={choose}
                />
                {profile.avatarUrl ? (
                    <Button title="Удалить фото" icon="trash-outline" variant="danger" small disabled={busy} onPress={remove} />
                ) : null}
            </View>
        </>
    );
}

// ---------- Имя ----------

function NameForm({ profile, onChange }: SectionProps) {
    const api = useApi();
    const { updateSession } = useSession();
    // null — пользователь ещё не правил поле: показываем имя из профиля (он перезагружается при каждом открытии экрана)
    const [draft, setDraft] = useState<string | null>(null);
    const name = draft ?? profile.name ?? '';
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    const unchanged = name.trim() === (profile.name ?? '');

    const save = async () => {
        const validationError = validateName(name.trim());
        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setSaved(false);
        setLoading(true);
        try {
            const updated = await api.profile.updateName(name.trim());
            onChange(updated);
            updateSession({ name: updated.name });
            setDraft(null);
            setSaved(true);
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SectionTitle>Имя</SectionTitle>
            <ErrorBanner message={error} />
            <TextField
                label="Имя"
                value={name}
                onChangeText={(value) => {
                    setDraft(value);
                    setSaved(false);
                }}
                placeholder="Как к вам обращаться"
                autoComplete="name"
                textContentType="name"
                maxLength={MAX_NAME_LENGTH}
                onSubmitEditing={save}
            />
            <SaveRow title="Сохранить имя" loading={loading} disabled={unchanged} saved={saved} onPress={save} />
        </>
    );
}

// ---------- Почта ----------

function EmailForm({ profile, onChange }: SectionProps) {
    const api = useApi();
    const { updateSession } = useSession();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    const save = async () => {
        const newEmail = email.trim();
        const validationError = validateEmail(newEmail) ?? (password ? null : 'Введите текущий пароль');
        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setSaved(false);
        setLoading(true);
        try {
            // бэкенд отдаёт новый токен — без него следующие запросы получат 401
            const auth = await api.profile.changeEmail(newEmail, password);
            updateSession(auth);
            onChange({ ...profile, email: auth.email });
            setEmail('');
            setPassword('');
            setSaved(true);
        } catch (e) {
            setError(profileErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SectionTitle>Почта</SectionTitle>
            <ErrorBanner message={error} />
            <TextField
                label="Новый email"
                value={email}
                onChangeText={(value) => {
                    setEmail(value);
                    setSaved(false);
                }}
                placeholder={profile.email}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
            />
            <TextField
                label="Текущий пароль"
                value={password}
                onChangeText={setPassword}
                placeholder="Для подтверждения"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={save}
            />
            <SaveRow title="Сменить почту" loading={loading} disabled={!email.trim()} saved={saved} onPress={save} />
        </>
    );
}

// ---------- Пароль ----------

function PasswordForm() {
    const api = useApi();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordRepeat, setPasswordRepeat] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    const save = async () => {
        const validationError = (currentPassword ? null : 'Введите текущий пароль')
            ?? validateNewPassword(newPassword, passwordRepeat);
        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setSaved(false);
        setLoading(true);
        try {
            await api.profile.changePassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setPasswordRepeat('');
            setSaved(true);
        } catch (e) {
            setError(profileErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SectionTitle>Пароль</SectionTitle>
            <ErrorBanner message={error} />
            <TextField
                label="Текущий пароль"
                value={currentPassword}
                onChangeText={(value) => {
                    setCurrentPassword(value);
                    setSaved(false);
                }}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
            />
            <TextField
                label="Новый пароль"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
            />
            <TextField
                label="Повторите новый пароль"
                value={passwordRepeat}
                onChangeText={setPasswordRepeat}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={save}
            />
            <SaveRow
                title="Сменить пароль"
                loading={loading}
                disabled={!currentPassword || !newPassword}
                saved={saved}
                onPress={save}
            />
        </>
    );
}

// ---------- Общее ----------

function SaveRow({ title, loading, disabled, saved, onPress }: {
    title: string;
    loading: boolean;
    disabled: boolean;
    saved: boolean;
    onPress: () => void;
}) {
    return (
        <View style={styles.saveRow}>
            <Button title={title} small loading={loading} disabled={disabled} onPress={onPress} />
            {saved ? <Text style={styles.saved}>Сохранено</Text> : null}
        </View>
    );
}

// ошибки UserService на бэкенде — по-русски
function profileErrorMessage(e: unknown): string {
    if (e instanceof ApiError) {
        if (e.message === 'Wrong current password') return 'Неверный текущий пароль';
        if (e.status === 409) return 'Этот email уже занят';
    }
    return errorMessage(e);
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerInfo: {
        flexShrink: 1,
        gap: 4,
    },
    name: {
        color: AppColors.text,
        fontSize: 20,
        fontWeight: '800',
    },
    email: {
        color: AppColors.textSecondary,
        fontSize: 15,
        marginBottom: 4,
    },
    buttons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    saveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    saved: {
        color: AppColors.success,
        fontSize: 14,
        fontWeight: '700',
    },
    logout: {
        marginTop: 32,
    },
});
