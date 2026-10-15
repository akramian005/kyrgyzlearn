import { Stack } from 'expo-router';

import { AppColors } from '@/constants/app-colors';

// Стек экранов внутри вкладки: курс и «О курсе» (общие для «Главной», «Поиска», «Профиля» и «Прочего»,
// (tabs)/(home,search,profile,more)) открываются внутри вкладки — панель остаётся видна, а открытый курс
// сохраняется при переключении вкладок, пока пользователь сам не выйдет из него.
export function TabStack() {
    return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppColors.background } }} />;
}
