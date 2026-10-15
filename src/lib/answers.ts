import type { AnswerOption, Question } from '@/lib/types';

// Проверка ответов ученика. selectedIds — выбранные варианты (для ORDER — в порядке выбора);
// для MATCHING — пары подряд: [вариант слева, вариант справа, вариант слева, вариант справа, …]

export function correctSequence(question: Question): AnswerOption[] {
    return question.options
        .filter((option) => option.correctPosition !== null)
        .sort((a, b) => a.correctPosition! - b.correctPosition!);
}

// пары ответа в «Сопоставлении»: [id варианта слева, id варианта, чей matchText выбран справа]
export function matchingPairs(selectedIds: number[]): [number, number][] {
    const pairs: [number, number][] = [];
    for (let i = 0; i + 1 < selectedIds.length; i += 2) pairs.push([selectedIds[i], selectedIds[i + 1]]);
    return pairs;
}

// можно ли нажимать «Проверить»: в «Сопоставлении» — когда соединены все пары
export function isAnswerComplete(question: Question, selectedIds: number[]): boolean {
    if (question.type === 'MATCHING') return selectedIds.length === question.options.length * 2;
    return selectedIds.length > 0;
}

export function isAnswerCorrect(question: Question, selectedIds: number[]): boolean {
    if (question.type === 'MATCHING') {
        const pairs = matchingPairs(selectedIds);
        return pairs.length === question.options.length && pairs.every(([left, right]) => left === right);
    }
    if (question.type === 'ORDER') {
        const expected = correctSequence(question).map((option) => option.id);
        return expected.length === selectedIds.length && expected.every((id, i) => id === selectedIds[i]);
    }

    const correctIds = question.options.filter((option) => option.correct).map((option) => option.id);
    return correctIds.length === selectedIds.length && correctIds.every((id) => selectedIds.includes(id));
}

// текст правильного ответа для подсказки после ошибки
export function correctAnswerText(question: Question): string {
    if (question.type === 'MATCHING') {
        return question.options.map((option) => `${option.text} — ${option.matchText ?? ''}`).join(', ');
    }
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
