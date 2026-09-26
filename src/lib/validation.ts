// те же правила, что в RegisterRequest / dto/user на бэкенде — проверяем заранее, чтобы показать понятную ошибку
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NAME_LENGTH = 50;

export function validateName(name: string): string | null {
    if (!name) return 'Введите имя';
    if (name.length > MAX_NAME_LENGTH) return `Имя должно быть не длиннее ${MAX_NAME_LENGTH} символов`;
    return null;
}

export function validateEmail(email: string): string | null {
    return EMAIL_REGEX.test(email) ? null : 'Введите корректный email';
}

export function validateNewPassword(password: string, passwordRepeat: string): string | null {
    if (password.length < MIN_PASSWORD_LENGTH) return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
    if (password !== passwordRepeat) return 'Пароли не совпадают';
    return null;
}
