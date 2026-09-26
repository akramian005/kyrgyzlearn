import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AnswerOption, Course, Lesson, LessonMessage, LessonSummary, Page, Question, QuestionType, Role } from '@/lib/types';
import { toFormData, type PickedFile } from '@/lib/files';

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

async function request<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<T> {
    const isForm = body instanceof FormData;
    const headers: Record<string, string> = { Accept: 'application/json' };
    // для FormData Content-Type с boundary выставляет сам fetch
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(0, 'Нет связи с сервером. Проверьте, что бэкенд запущен.');
    }

    const text = await response.text();

    if (!response.ok) {
        // Spring отдаёт ошибку как { status, error, message, ... }
        let message = `Ошибка сервера (${response.status})`;
        try {
            message = JSON.parse(text).message ?? message;
        } catch {
            // тело не JSON — оставляем общее сообщение
        }
        throw new ApiError(response.status, message);
    }

    // DELETE отвечает 204 без тела, загрузка файла — строкой со ссылкой
    if (!text) return undefined as T;
    try {
        return JSON.parse(text) as T;
    } catch {
        return text as T;
    }
}

export const authApi = {
    login: (email: string, password: string) =>
        request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),

    register: (email: string, password: string) =>
        request<AuthResponse>('/api/auth/register', { method: 'POST', body: { email, password } }),
};

// ---------- Тела запросов ----------

export type CourseInput = { title: string; description: string | null };

export type LessonInput = { title: string; description: string | null };

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

    const upload = (path: string, file: PickedFile) =>
        call<string>(path, { method: 'POST', body: toFormData(file) });

    return {
        courses: {
            list: () => call<Page<Course>>(`/api/courses?${ALL}`).then((page) => page.content),
            get: (id: number) => call<Course>(`/api/courses/${id}`),
            create: (input: CourseInput) => call<Course>('/api/courses', { method: 'POST', body: input }),
            update: (id: number, input: Partial<CourseInput>) =>
                call<Course>(`/api/courses/${id}`, { method: 'PATCH', body: input }),
            remove: (id: number) => call<void>(`/api/courses/${id}`, { method: 'DELETE' }),
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
