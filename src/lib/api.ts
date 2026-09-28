import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AnswerOption, Course, CourseItem, CourseVideo, Lesson, LessonMessage, LessonSummary, Page, Progress, Question, QuestionType, Role, UserProfile } from '@/lib/types';
import type { PickedFile } from '@/lib/files';
import { uploadFile } from '@/lib/upload';

const BACKEND_PORT = 8080;

// Адрес бэкенда:
// 1. EXPO_PUBLIC_API_URL из .env, если задан (например, для прода);
// 2. в вебе — localhost;
// 3. на телефоне/эмуляторе — IP компьютера, на котором запущен `expo start`
//    (localhost на телефоне указывает на сам телефон, а не на компьютер).
function resolveApiUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, '');

    if (Platform.OS === 'web') return `http://localhost:${BACKEND_PORT}`;

    const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
    return `http://${devHost ?? 'localhost'}:${BACKEND_PORT}`;
}

export const API_URL = resolveApiUrl();

export type AuthResponse = {
    token: string;
    email: string;
    name: string | null;
    role: Role;
};

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

type RequestOptions = {
    method?: string;
    body?: unknown;
    token?: string | null;
};

const NO_CONNECTION = 'Нет связи с сервером. Проверьте, что бэкенд запущен.';

async function request<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(0, NO_CONNECTION);
    }

    return parseResponse<T>(response.status, await response.text());
}

// Загрузка картинки/аудио: на телефоне и в вебе файл отправляется по-разному (см. lib/upload)
async function uploadRequest(path: string, token: string | null, file: PickedFile): Promise<string> {
    let result;
    try {
        result = await uploadFile(`${API_URL}${path}`, token, file);
    } catch {
        throw new ApiError(0, NO_CONNECTION);
    }

    try {
        return parseResponse<string>(result.status, result.body);
    } catch (e) {
        throw e instanceof ApiError ? new ApiError(e.status, uploadErrorMessage(e)) : e;
    }
}

function parseResponse<T>(status: number, text: string): T {
    if (status < 200 || status >= 300) {
        // Spring отдаёт ошибку как { status, error, message, ... }
        let message = `Ошибка сервера (${status})`;
        try {
            message = JSON.parse(text).message ?? message;
        } catch {
            // тело не JSON — оставляем общее сообщение
        }
        throw new ApiError(status, message);
    }

    // DELETE отвечает 204 без тела, загрузка файла — строкой со ссылкой
    if (!text) return undefined as T;
    try {
        return JSON.parse(text) as T;
    } catch {
        return text as T;
    }
}

// Ошибки FileStorageService на бэкенде — по-русски и с подсказкой, что делать
function uploadErrorMessage(e: ApiError): string {
    if (e.status === 413 || e.message === 'File too large') {
        return 'Файл слишком большой: картинка — до 10 МБ, аудио — до 20 МБ, видео — до 500 МБ';
    }
    if (e.message.startsWith('Invalid file type')) return 'Этот формат файла не поддерживается';
    if (e.message === 'File is empty') return 'Файл пустой';
    if (e.message === 'Failed to upload file') {
        return 'Сервер не смог сохранить файл. Проверьте, что запущено хранилище MinIO (docker compose up -d minio)';
    }
    return e.message;
}

export const authApi = {
    login: (email: string, password: string) =>
        request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),

    register: (name: string, email: string, password: string) =>
        request<AuthResponse>('/api/auth/register', { method: 'POST', body: { name, email, password } }),
};

// ---------- Тела запросов ----------

export type CourseInput = { title: string; description: string | null };

export type LessonInput = { title: string; description: string | null };

export type VideoInput = { title: string; description: string | null };

export type OptionInput = { text: string; correct: boolean; correctPosition: number | null };

export type QuestionInput = { text: string; type: QuestionType; options: OptionInput[]; position?: number };

export type MessageInput = { text: string; position?: number };

// бэкенд отдаёт списки постранично — берём заведомо большую страницу
const ALL = 'size=1000';

// Все запросы, которым нужен токен текущего пользователя.
// onUnauthorized вызывается, если бэкенд ответил 401 на запрос с токеном (токен протух)
export function createApi(token: string | null, onUnauthorized?: () => void) {
    const call = async <T>(path: string, options: Omit<RequestOptions, 'token'> = {}) => {
        try {
            return await request<T>(path, { ...options, token });
        } catch (e) {
            if (token && e instanceof ApiError && e.status === 401) onUnauthorized?.();
            throw e;
        }
    };

    const upload = async (path: string, file: PickedFile) => {
        try {
            return await uploadRequest(path, token, file);
        } catch (e) {
            if (token && e instanceof ApiError && e.status === 401) onUnauthorized?.();
            throw e;
        }
    };

    return {
        // профиль текущего пользователя
        profile: {
            get: () => call<UserProfile>('/api/users/me'),
            updateName: (name: string) => call<UserProfile>('/api/users/me', { method: 'PATCH', body: { name } }),
            // в ответе новый токен: старый привязан к прежней почте
            changeEmail: (email: string, currentPassword: string) =>
                call<AuthResponse>('/api/users/me/email', { method: 'PATCH', body: { email, currentPassword } }),
            changePassword: (currentPassword: string, newPassword: string) =>
                call<void>('/api/users/me/password', { method: 'PATCH', body: { currentPassword, newPassword } }),
            uploadAvatar: (file: PickedFile) => upload('/api/users/me/avatar', file),
            removeAvatar: () => call<void>('/api/users/me/avatar', { method: 'DELETE' }),
        },

        courses: {
            list: () => call<Page<Course>>(`/api/courses?${ALL}`).then((page) => page.content),
            get: (id: number) => call<Course>(`/api/courses/${id}`),
            create: (input: CourseInput) => call<Course>('/api/courses', { method: 'POST', body: input }),
            update: (id: number, input: Partial<CourseInput>) =>
                call<Course>(`/api/courses/${id}`, { method: 'PATCH', body: input }),
            remove: (id: number) => call<void>(`/api/courses/${id}`, { method: 'DELETE' }),
            // уроки и видео курса одним списком по порядку
            items: (id: number) => call<CourseItem[]>(`/api/courses/${id}/items`),
            // личные курсы всех пользователей по названию, постранично (page — с 0)
            search: (query: string, page: number, size: number) =>
                call<Page<Course>>(`/api/courses/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`),
            // переместить урок или видео на новую позицию; возвращает новый порядок
            moveItem: (id: number, item: CourseItem, position: number) =>
                call<CourseItem[]>(`/api/courses/${id}/items/position`, {
                    method: 'PATCH',
                    body: { kind: item.kind, id: item.id, position },
                }),
        },

        // прогресс текущего пользователя: пройденные уроки и курсы
        progress: {
            get: () => call<Progress>('/api/progress'),
            // повторная отметка уже пройденного урока — не ошибка
            completeLesson: (lessonId: number) => call<void>(`/api/progress/lessons/${lessonId}`, { method: 'PUT' }),
            // видео открыли — считается просмотренным
            watchVideo: (courseId: number, videoId: number) =>
                call<void>(`/api/progress/courses/${courseId}/videos/${videoId}`, { method: 'PUT' }),
        },

        // сохранённые курсы текущего пользователя
        saved: {
            list: () => call<Course[]>('/api/saved-courses'),
            add: (courseId: number) => call<void>(`/api/saved-courses/${courseId}`, { method: 'PUT' }),
            remove: (courseId: number) => call<void>(`/api/saved-courses/${courseId}`, { method: 'DELETE' }),
        },

        videos: {
            get: (courseId: number, id: number) => call<CourseVideo>(`/api/courses/${courseId}/videos/${id}`),
            create: (courseId: number, input: VideoInput) =>
                call<CourseVideo>(`/api/courses/${courseId}/videos`, { method: 'POST', body: input }),
            update: (courseId: number, id: number, input: Partial<VideoInput>) =>
                call<CourseVideo>(`/api/courses/${courseId}/videos/${id}`, { method: 'PATCH', body: input }),
            remove: (courseId: number, id: number) =>
                call<void>(`/api/courses/${courseId}/videos/${id}`, { method: 'DELETE' }),
            uploadFile: (courseId: number, id: number, file: PickedFile) =>
                upload(`/api/courses/${courseId}/videos/${id}/file`, file),
            removeFile: (courseId: number, id: number) =>
                call<void>(`/api/courses/${courseId}/videos/${id}/file`, { method: 'DELETE' }),
        },

        lessons: {
            listByCourse: (courseId: number) =>
                call<Page<LessonSummary>>(`/api/lessons?courseId=${courseId}&${ALL}`).then((page) => page.content),
            get: (id: number) => call<Lesson>(`/api/lessons/${id}`),
            create: (courseId: number, input: LessonInput) =>
                call<Lesson>('/api/lessons', { method: 'POST', body: { ...input, courseId } }),
            update: (id: number, input: Partial<LessonInput>) =>
                call<Lesson>(`/api/lessons/${id}`, { method: 'PATCH', body: input }),
            remove: (id: number) => call<void>(`/api/lessons/${id}`, { method: 'DELETE' }),
            // переместить вопрос/сообщение на новую позицию внутри урока
            moveItem: (lessonId: number, itemId: number, position: number) =>
                call<Lesson>(`/api/lessons/${lessonId}/items/${itemId}/position`, { method: 'PATCH', body: { position } }),
        },

        questions: {
            create: (lessonId: number, input: QuestionInput) =>
                call<Question>(`/api/lessons/${lessonId}/questions`, { method: 'POST', body: input }),
            update: (lessonId: number, id: number, input: { text?: string; type?: QuestionType }) =>
                call<Question>(`/api/lessons/${lessonId}/questions/${id}`, { method: 'PATCH', body: input }),
            remove: (lessonId: number, id: number) =>
                call<void>(`/api/lessons/${lessonId}/questions/${id}`, { method: 'DELETE' }),
            uploadAudio: (lessonId: number, id: number, file: PickedFile) =>
                upload(`/api/lessons/${lessonId}/questions/${id}/audio`, file),
            removeAudio: (lessonId: number, id: number) =>
                call<void>(`/api/lessons/${lessonId}/questions/${id}/audio`, { method: 'DELETE' }),
        },

        options: {
            create: (lessonId: number, questionId: number, input: OptionInput) =>
                call<AnswerOption>(`/api/lessons/${lessonId}/questions/${questionId}/options`, { method: 'POST', body: input }),
            update: (lessonId: number, questionId: number, id: number, input: OptionInput) =>
                call<AnswerOption>(`/api/lessons/${lessonId}/questions/${questionId}/options/${id}`, { method: 'PATCH', body: input }),
            remove: (lessonId: number, questionId: number, id: number) =>
                call<void>(`/api/lessons/${lessonId}/questions/${questionId}/options/${id}`, { method: 'DELETE' }),
        },

        messages: {
            create: (lessonId: number, input: MessageInput) =>
                call<LessonMessage>(`/api/lessons/${lessonId}/messages`, { method: 'POST', body: input }),
            update: (lessonId: number, id: number, input: { text: string }) =>
                call<LessonMessage>(`/api/lessons/${lessonId}/messages/${id}`, { method: 'PATCH', body: input }),
            remove: (lessonId: number, id: number) =>
                call<void>(`/api/lessons/${lessonId}/messages/${id}`, { method: 'DELETE' }),
            uploadImage: (lessonId: number, id: number, file: PickedFile) =>
                upload(`/api/lessons/${lessonId}/messages/${id}/image`, file),
            uploadAudio: (lessonId: number, id: number, file: PickedFile) =>
                upload(`/api/lessons/${lessonId}/messages/${id}/audio`, file),
            removeImage: (lessonId: number, id: number) =>
                call<void>(`/api/lessons/${lessonId}/messages/${id}/image`, { method: 'DELETE' }),
            removeAudio: (lessonId: number, id: number) =>
                call<void>(`/api/lessons/${lessonId}/messages/${id}/audio`, { method: 'DELETE' }),
        },
    };
}

export type Api = ReturnType<typeof createApi>;
