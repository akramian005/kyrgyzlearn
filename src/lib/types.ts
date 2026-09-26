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
};

export type LessonSummary = {
    id: number;
    courseId: number;
    title: string;
    description: string | null;
    position: number;
    itemCount: number;
};

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
