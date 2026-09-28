// Типы ответов бэкенда (см. dto/* в kyrgyz-learn)

export type Role = 'USER' | 'ADMIN';

export type CourseType = 'OFFICIAL' | 'USER';

export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'ORDER';

export type Page<T> = {
    content: T[];
    totalElements: number;
};

export type UserProfile = {
    id: number;
    email: string;
    // у старых аккаунтов, созданных до появления имени, может быть null
    name: string | null;
    role: Role;
    avatarUrl: string | null;
};

export type Course = {
    id: number;
    title: string;
    description: string | null;
    position: number;
    type: CourseType;
    ownerId: number | null;
    lessonCount: number;
    videoCount: number;
};

export type LessonSummary = {
    kind: 'LESSON';
    id: number;
    courseId: number;
    title: string;
    description: string | null;
    position: number;
    itemCount: number;
};

// Видео курса: стоит в общем списке курса между уроками
export type CourseVideo = {
    kind: 'VIDEO';
    id: number;
    courseId: number;
    position: number;
    title: string;
    description: string | null;
    // null — файл ещё не загружен
    videoUrl: string | null;
};

// элемент курса: уроки и видео идут одним списком с общей нумерацией position
export type CourseItem = LessonSummary | CourseVideo;

export type AnswerOption = {
    id: number;
    text: string;
    sortOrder: number;
    // SINGLE_CHOICE / MULTIPLE_CHOICE
    correct: boolean;
    // ORDER: место в правильной последовательности, null — лишний вариант
    correctPosition: number | null;
};

export type Question = {
    kind: 'QUESTION';
    id: number;
    position: number;
    text: string;
    audioUrl: string | null;
    type: QuestionType;
    options: AnswerOption[];
};

export type LessonMessage = {
    kind: 'MESSAGE';
    id: number;
    position: number;
    text: string;
    imageUrl: string | null;
    audioUrl: string | null;
};

export type LessonItem = Question | LessonMessage;

export type Lesson = {
    id: number;
    courseId: number;
    title: string;
    description: string | null;
    position: number;
    items: LessonItem[];
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    SINGLE_CHOICE: 'Один ответ',
    MULTIPLE_CHOICE: 'Несколько ответов',
    ORDER: 'Последовательность',
};
