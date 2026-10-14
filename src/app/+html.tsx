import { ScrollViewStyleReset } from 'expo-router/html';
import React, { type PropsWithChildren } from 'react';

import { AppColors } from '@/constants/app-colors';

// HTML-обёртка веб-версии (только web, собирается на сервере).
// Тёмный фон у html/body и theme-color нужны мобильному браузеру: им он красит полосы
// у системных кнопок навигации и адресной строки — иначе там остаётся белый фон по умолчанию.
export default function Root({ children }: PropsWithChildren) {
    return (
        <html lang="ru">
            <head>
                <meta charSet="utf-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
                <meta name="theme-color" content={AppColors.background} />
                <meta name="color-scheme" content="dark" />
                {/* иконка при «Добавить на экран Домой» на iPhone (файл в public/) */}
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <ScrollViewStyleReset />
                <style dangerouslySetInnerHTML={{ __html: pageBackground }} />
            </head>
            <body>{children}</body>
        </html>
    );
}

const pageBackground = `
html, body, #root {
    background-color: ${AppColors.background};
}
/* у многострочных полей свой ползунок (ScrollThumb в app-ui) — системный скрываем, чтобы не было двух */
textarea {
    scrollbar-width: none;
}
textarea::-webkit-scrollbar {
    display: none;
}`;
