// Всплывающее уведомление внизу экрана (рисует ToastHost в корневом layout).
// Вызывается откуда угодно, в т.ч. не из компонентов: api.ts показывает так «Нет связи с сервером».
// Одновременно видно одно уведомление; повтор того же текста просто продлевает показ.

type Listener = (message: string) => void;

let listener: Listener | null = null;

export function showToast(message: string) {
    listener?.(message);
}

export function subscribeToast(next: Listener): () => void {
    listener = next;
    return () => {
        if (listener === next) listener = null;
    };
}
