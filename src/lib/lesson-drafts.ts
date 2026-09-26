import { emptyMedia, type MediaDraft } from '@/components/editor/media-field';
import type { Api, OptionInput } from '@/lib/api';
import type { LessonMessage, Question, QuestionType } from '@/lib/types';

// Черновики вопросов и сообщений в редакторе урока + сохранение их на бэкенд

export type OptionDraft = {
    key: string;
    id: number | null;   // null — новый вариант, ещё не сохранён
    text: string;
    correct: boolean;    // SINGLE_CHOICE / MULTIPLE_CHOICE
    inAnswer: boolean;   // ORDER: входит в правильную последовательность (порядок = порядок в списке)
};

export type QuestionDraft = {
    text: string;
    type: QuestionType;
    options: OptionDraft[];
    audio: MediaDraft;
};

export type MessageDraft = {
    text: string;
    image: MediaDraft;
    audio: MediaDraft;
};

let keyCounter = 0;

export function newOption(): OptionDraft {
    keyCounter += 1;
    return { key: `new-${keyCounter}`, id: null, text: '', correct: false, inAnswer: true };
}

export function newQuestionDraft(): QuestionDraft {
    return { text: '', type: 'SINGLE_CHOICE', options: [newOption(), newOption()], audio: emptyMedia() };
}

export function questionToDraft(question: Question): QuestionDraft {
    let options: OptionDraft[] = question.options.map((option) => ({
        key: `option-${option.id}`,
        id: option.id,
        text: option.text,
        correct: option.correct,
        inAnswer: option.correctPosition !== null,
    }));

    if (question.type === 'ORDER') {
        // в редакторе правильная последовательность идёт сверху по порядку, лишние варианты — после
        const positionById = new Map(question.options.map((option) => [option.id, option.correctPosition]));
        const inAnswer = options
            .filter((option) => option.inAnswer)
            .sort((a, b) => (positionById.get(a.id!) ?? 0) - (positionById.get(b.id!) ?? 0));
        options = [...inAnswer, ...options.filter((option) => !option.inAnswer)];
    }

    return { text: question.text, type: question.type, options, audio: emptyMedia(question.audioUrl) };
}

export function newMessageDraft(): MessageDraft {
    return { text: '', image: emptyMedia(), audio: emptyMedia() };
}

export function messageToDraft(message: LessonMessage): MessageDraft {
    return { text: message.text, image: emptyMedia(message.imageUrl), audio: emptyMedia(message.audioUrl) };
}

// При смене типа вопроса подгоняем отметки правильных ответов под новый тип
export function changeQuestionType(draft: QuestionDraft, type: QuestionType): QuestionDraft {
    if (type !== 'SINGLE_CHOICE') return { ...draft, type };

    const firstCorrect = draft.options.findIndex((option) => option.correct);
    return {
        ...draft,
        type,
        options: draft.options.map((option, index) => ({ ...option, correct: index === firstCorrect })),
    };
}

export function validateQuestion(draft: QuestionDraft): string | null {
    if (!draft.text.trim()) return 'Введите текст вопроса';
    if (draft.options.length < 2) return 'Нужно минимум 2 варианта ответа';
    if (draft.options.some((option) => !option.text.trim())) return 'Заполните текст всех вариантов или удалите пустые';

    const correctCount = draft.options.filter((option) => option.correct).length;
    const inAnswerCount = draft.options.filter((option) => option.inAnswer).length;

    switch (draft.type) {
        case 'SINGLE_CHOICE':
            return correctCount === 1 ? null : 'Отметьте один правильный вариант';
        case 'MULTIPLE_CHOICE':
            return correctCount >= 1 ? null : 'Отметьте хотя бы один правильный вариант';
        case 'ORDER':
            return inAnswerCount >= 2 ? null : 'В правильной последовательности должно быть минимум 2 варианта';
    }
}

export function validateMessage(draft: MessageDraft): string | null {
    return draft.text.trim() ? null : 'Введите текст сообщения';
}

function toOptionInputs(draft: QuestionDraft): OptionInput[] {
    let position = 0;
    return draft.options.map((option) => draft.type === 'ORDER'
        ? { text: option.text.trim(), correct: false, correctPosition: option.inAnswer ? position++ : null }
        : { text: option.text.trim(), correct: option.correct, correctPosition: null });
}

async function applyMedia(draft: MediaDraft, upload: (file: NonNullable<MediaDraft['picked']>) => Promise<unknown>, remove: () => Promise<unknown>) {
    // при загрузке бэкенд сам удаляет старый файл
    if (draft.picked) {
        await upload(draft.picked);
    } else if (draft.removed && draft.url) {
        await remove();
    }
}

// original === null — создаём новый вопрос на позиции position
export async function saveQuestion(api: Api, lessonId: number, original: Question | null, draft: QuestionDraft, position?: number) {
    const text = draft.text.trim();
    const inputs = toOptionInputs(draft);
    let questionId: number;

    if (!original) {
        questionId = (await api.questions.create(lessonId, { text, type: draft.type, options: inputs, position })).id;
    } else {
        questionId = original.id;

        if (text !== original.text || draft.type !== original.type) {
            await api.questions.update(lessonId, questionId, { text, type: draft.type });
        }

        const keptIds = new Set(draft.options.map((option) => option.id));
        for (const option of original.options) {
            if (!keptIds.has(option.id)) await api.options.remove(lessonId, questionId, option.id);
        }

        for (const [index, option] of draft.options.entries()) {
            const input = inputs[index];
            if (option.id === null) {
                await api.options.create(lessonId, questionId, input);
                continue;
            }
            const before = original.options.find((o) => o.id === option.id);
            const changed = !before
                || before.text !== input.text
                || before.correct !== input.correct
                || before.correctPosition !== input.correctPosition;
            if (changed) await api.options.update(lessonId, questionId, option.id, input);
        }
    }

    await applyMedia(
        draft.audio,
        (file) => api.questions.uploadAudio(lessonId, questionId, file),
        () => api.questions.removeAudio(lessonId, questionId),
    );
}

export async function saveMessage(api: Api, lessonId: number, original: LessonMessage | null, draft: MessageDraft, position?: number) {
    const text = draft.text.trim();
    let messageId: number;

    if (!original) {
        messageId = (await api.messages.create(lessonId, { text, position })).id;
    } else {
        messageId = original.id;
        if (text !== original.text) await api.messages.update(lessonId, messageId, { text });
    }

    await applyMedia(
        draft.image,
        (file) => api.messages.uploadImage(lessonId, messageId, file),
        () => api.messages.removeImage(lessonId, messageId),
    );
    await applyMedia(
        draft.audio,
        (file) => api.messages.uploadAudio(lessonId, messageId, file),
        () => api.messages.removeAudio(lessonId, messageId),
    );
}
