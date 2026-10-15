// Типы ответов бэкенда (см. dto/* в kyrgyz-learn)

export type Role = 'USER' | 'ADMIN';

export type CourseType = 'OFFICIAL' | 'USER';

export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'ORDER' | 'MATCHING';

// в «Сопоставлении» не больше 10 пар (то же ограничение на бэкенде, QuestionType.MAX_MATCHING_PAIRS)
export const MAX_MATCHING_PAIRS = 10;

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
    // картинка курса; null — нет, тогда вместо неё первая буква названия
    imageUrl: string | null;
    position: number;
    type: CourseType;
    ownerId: number | null;
    // имя создателя; null у официальных курсов и у пользователей без имени
    ownerName: string | null;
    lessonCount: number;
    videoCount: number;
    // сколько уроков пройдено и видео просмотрено текущим пользователем
    completedItemCount: number;
    // сколько уроков и видео идут в прогресс (без пустых уроков и видео без файла)
    totalItemCount: number;
    // курс в сохранённых у текущего пользователя
    saved: boolean;
};

// у урока нет своего названия — он «Урок N» в своём юните (title/description остались у старых уроков)
export type LessonSummary = {
    kind: 'LESSON';
    id: number;
    courseId: number;
    title: string | null;
    description: string | null;
    position: number;
    itemCount: number;
    // урок пройден текущим пользователем
    completed: boolean;
    unitId: number | null;
};

// Сводка прогресса для профиля
export type Progress = {
    completedLessons: number;
    completedCourses: number;
    // опыт: 5 XP за каждый пройденный урок и 20 XP за каждый пройденный курс
    xp: number;
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
    // текущий пользователь уже открывал это видео
    watched: boolean;
    unitId: number | null;
};

// элемент курса: уроки и видео идут одним списком с общей нумерацией position
export type CourseItem = LessonSummary | CourseVideo;

// Юнит (этап) курса: на экране курса — кружок «змейки», внутри — уроки и видео по порядку
export type Unit = {
    id: number;
    courseId: number;
    title: string;
    position: number;
    items: CourseItem[];
};

export type AnswerOption = {
    id: number;
    text: string;
    sortOrder: number;
    // SINGLE_CHOICE / MULTIPLE_CHOICE
    correct: boolean;
    // ORDER: место в правильной последовательности, null — лишний вариант
    correctPosition: number | null;
    // MATCHING: вторая половина пары, с которой сопоставляется text
    matchText: string | null;
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
    title: string | null;
    description: string | null;
    position: number;
    items: LessonItem[];
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    SINGLE_CHOICE: 'Один ответ',
    MULTIPLE_CHOICE: 'Несколько ответов',
    ORDER: 'Последовательность',
    MATCHING: 'Сопоставление',
};
