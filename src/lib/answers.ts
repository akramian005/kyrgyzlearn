import type { AnswerOption, Question } from '@/lib/types';

// Проверка ответов ученика. selectedIds — выбранные варианты (для ORDER — в порядке выбора)

export function correctSequence(question: Question): AnswerOption[] {
    return question.options
        .filter((option) => option.correctPosition !== null)
        .sort((a, b) => a.correctPosition! - b.correctPosition!);
}

export function isAnswerCorrect(question: Question, selectedIds: number[]): boolean {
    if (question.type === 'ORDER') {
        const expected = correctSequence(question).map((option) => option.id);
        return expected.length === selectedIds.length && expected.every((id, i) => id === selectedIds[i]);
    }

    const correctIds = question.options.filter((option) => option.correct).map((option) => option.id);
    return correctIds.length === selectedIds.length && correctIds.every((id) => selectedIds.includes(id));
}

// текст правильного ответа для подсказки после ошибки
export function correctAnswerText(question: Question): string {
    if (question.type === 'ORDER') {
        return correctSequence(question).map((option) => option.text).join(' ');
    }
    return question.options.filter((option) => option.correct).map((option) => option.text).join(', ');
}

export function shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
