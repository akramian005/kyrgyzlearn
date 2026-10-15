import { TabStack } from '@/components/tab-stack';

// главный экран вкладки всегда лежит в стеке первым — «Назад» с вложенного экрана возвращает на него,
// даже если вложенный экран открыли ссылкой
export const unstable_settings = { initialRouteName: 'search' };

export default TabStack;
