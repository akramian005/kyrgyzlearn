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
}`;
