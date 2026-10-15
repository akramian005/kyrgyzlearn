import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Avatar } from '@/components/avatar';
import { Badge, Button, Card, ErrorBanner, LoadingView, Page, SectionTitle, TextField, Title } from '@/components/app-ui';
import { AppColors } from '@/constants/app-colors';
import { ApiError } from '@/lib/api';
import { confirmAsync } from '@/lib/confirm';
import { pickFile } from '@/lib/files';
import { errorMessage, useApi, useLoader } from '@/lib/hooks';
import type { Course, Progress, UserProfile } from '@/lib/types';
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, validateEmail, validateName, validateNewPassword } from '@/lib/validation';

// «Профиль»: аватар (меняется нажатием на него), прогресс, сохранённые курсы, имя, почта, пароль и выход
export default function ProfileScreen() {
    const { session, signOut } = useSession();
    const api = useApi();
    const { data: profile, error, loading, reload, setData } = useLoader(() => api.profile.get(), 'profile');
    // отдельный загрузчик: курс могли сохранить или убрать на экране курса — при возврате список обновится
    const saved = useLoader(() => api.saved.list(), 'saved');
    // после урока при возврате в профиль счётчики обновятся
    const progress = useLoader(() => api.progress.get(), 'progress');

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
        <Page onRefresh={() => {
            void reload();
            void saved.reload();
            void progress.reload();
        }}>
            <Title>Профиль</Title>

            <ErrorBanner message={error} />

            <Card>
                <View style={styles.header}>
                    <AvatarControl profile={profile} name={name || email} onChange={setData} />
                    <View style={styles.headerInfo}>
                        <Text style={styles.name} numberOfLines={1}>{name || 'Без имени'}</Text>
                        <Text style={styles.email} numberOfLines={1}>{email}</Text>
                        {isAdmin ? <Badge label="Админ" /> : <Badge label="Ученик" color={AppColors.blue} />}
                    </View>
                </View>
            </Card>

            <ProgressStats progress={progress.data} error={progress.error} />

            <SavedCourses courses={saved.data} error={saved.error} />

            {profile ? (
                <>
                    <NameForm profile={profile} onChange={setData} />
                    <EmailForm profile={profile} onChange={setData} />
                    <PasswordForm />
                </>
            ) : null}

            <Button title="Выйти" icon="log-out-outline" variant="danger" onPress={logout} style={styles.logout} />
        </Page>
    );
}

// ---------- Прогресс ----------

// курс пройден, когда пройдены все его уроки (видео не считаются)
function ProgressStats({ progress, error }: { progress: Progress | undefined; error: string | null }) {
    return (
        <>
            <ErrorBanner message={error} />
            <View style={styles.stats}>
                <Card style={styles.stat}>
                    <Ionicons name="checkmark-circle" size={28} color={AppColors.gold} />
                    <Text style={styles.statValue}>{progress?.completedLessons ?? '—'}</Text>
                    <Text style={styles.statLabel}>уроков пройдено</Text>
                </Card>
                <Card style={styles.stat}>
                    <Ionicons name="trophy" size={28} color={AppColors.gold} />
                    <Text style={styles.statValue}>{progress?.completedCourses ?? '—'}</Text>
                    <Text style={styles.statLabel}>курсов пройдено</Text>
                </Card>
                <Card style={styles.stat}>
                    <Ionicons name="flash" size={28} color={AppColors.gold} />
                    <Text style={styles.statValue}>{progress?.xp ?? '—'}</Text>
                    <Text style={styles.statLabel}>XP</Text>
                </Card>
            </View>
        </>
    );
}

// ---------- Сохранённые курсы ----------

// Строка-ссылка на экран «Сохранённые курсы»: сам список там, по страницам, — профиль не растёт
function SavedCourses({ courses, error }: { courses: Course[] | undefined; error: string | null }) {
    return (
        <>
            <SectionTitle>Сохранённые курсы</SectionTitle>
            <ErrorBanner message={error} />
            <Card onPress={() => router.push('/saved')} style={styles.savedLink}>
                <View style={styles.savedIcon}>
                    <Ionicons name="bookmark" size={22} color={AppColors.blue} />
                </View>
                <View style={styles.savedBody}>
                    <Text style={styles.savedTitle}>Сохранённые курсы</Text>
                    <Text style={styles.savedCount}>{courses ? savedCountLabel(courses.length) : '…'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={AppColors.textSecondary} />
            </Card>
        </>
    );
}

function savedCountLabel(count: number): string {
    if (count === 0) return 'Пока ничего не сохранено';
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} курс`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} курса`;
    return `${count} курсов`;
}

type SectionProps = {
    profile: UserProfile;
    onChange: (profile: UserProfile) => void;
};

// ---------- Аватар ----------

// Аватар в шапке профиля: нажатие на него или на значок камеры рядом — сменить или удалить фото.
// Если фото ещё нет, сразу открывается выбор файла; файл загружается сразу, без кнопки «Сохранить».
function AvatarControl({ profile, name, onChange }: {
    profile: UserProfile | undefined;
    name: string;
    onChange: (profile: UserProfile) => void;
}) {
    const api = useApi();
    const [menuOpen, setMenuOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const run = async (action: () => Promise<void>) => {
        setMenuOpen(false);
        setError(null);
        setBusy(true);
        try {
            await action();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const choose = async () => {
        const picked = await pickFile('image');
        if (!picked || !profile) return;
        await run(async () => {
            const avatarUrl = await api.profile.uploadAvatar(picked);
            onChange({ ...profile, avatarUrl });
        });
    };

    const remove = async () => {
        if (!profile) return;
        if (!(await confirmAsync('Удалить фото?', 'Вместо него будет показана первая буква имени'))) return;
        await run(async () => {
            await api.profile.removeAvatar();
            onChange({ ...profile, avatarUrl: null });
        });
    };

    const open = () => {
        setError(null);
        if (profile?.avatarUrl) setMenuOpen((value) => !value);
        else void choose();
    };

    return (
        <View>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={profile?.avatarUrl ? 'Сменить или удалить фото' : 'Загрузить фото'}
                disabled={!profile || busy}
                onPress={open}
                style={({ pressed }) => pressed && styles.pressed}
            >
                <Avatar url={profile?.avatarUrl} name={name} />
                {busy ? (
                    <View style={styles.avatarBusy}>
                        <ActivityIndicator color="#fff" />
                    </View>
                ) : null}
            </Pressable>

            {/* кнопка управления фото — на краю аватара */}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Управление фото"
                disabled={!profile || busy}
                onPress={open}
                hitSlop={6}
                style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
            >
                <Ionicons name="camera" size={18} color="#fff" />
            </Pressable>

            {menuOpen ? (
                <View style={styles.avatarMenu}>
                    <Button title="Сменить фото" icon="image-outline" variant="secondary" small onPress={choose} />
                    <Button title="Удалить фото" icon="trash-outline" variant="danger" small onPress={remove} />
                    <Button title="Отмена" variant="ghost" small onPress={() => setMenuOpen(false)} />
                </View>
            ) : null}
            <View style={styles.avatarError}>
                <ErrorBanner message={error} />
            </View>
        </View>
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
function profileErrorMessage(e: unknown): string | null {
    if (e instanceof ApiError) {
        if (e.message === 'Wrong current password') return 'Неверный текущий пароль';
        if (e.status === 409) return 'Этот email уже занят';
    }
    return errorMessage(e);
}

const styles = StyleSheet.create({
    savedLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    savedIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: AppColors.blueBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    savedBody: {
        flex: 1,
        gap: 2,
    },
    savedTitle: {
        color: AppColors.text,
        fontSize: 16,
        fontWeight: '800',
    },
    savedCount: {
        color: AppColors.textSecondary,
        fontSize: 14,
    },
    pressed: {
        opacity: 0.7,
    },
    avatarBusy: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarButton: {
        position: 'absolute',
        right: -2,
        top: 64,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: AppColors.blue,
        borderWidth: 3,
        borderColor: AppColors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarMenu: {
        marginTop: 10,
        gap: 6,
        alignItems: 'flex-start',
    },
    avatarError: {
        marginTop: 8,
        maxWidth: 200,
    },
    stats: {
        flexDirection: 'row',
        gap: 12,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        color: AppColors.text,
        fontSize: 26,
        fontWeight: '800',
    },
    statLabel: {
        color: AppColors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        // в три карточки подпись может перенестись на вторую строку
        textAlign: 'center',
    },
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
