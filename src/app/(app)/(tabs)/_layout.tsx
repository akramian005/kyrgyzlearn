import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { AppColors } from '@/constants/app-colors';

// с этой ширины (планшет, веб) панель переезжает влево, как у Duolingo на сайте
const SIDEBAR_MIN_WIDTH = 768;

export default function TabsLayout() {
    const { width } = useWindowDimensions();
    const sidebar = width >= SIDEBAR_MIN_WIDTH;
    const insets = useSafeAreaInsets();
    // у админа вместо «Прочее» (свои курсы) — раздел редактирования официальных курсов, см. more.tsx
    const isAdmin = useSession().session?.role === 'ADMIN';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarPosition: sidebar ? 'left' : 'bottom',
                tabBarVariant: sidebar ? 'material' : 'uikit',
                tabBarLabelPosition: sidebar ? 'beside-icon' : 'below-icon',
                tabBarActiveTintColor: AppColors.blue,
                tabBarInactiveTintColor: AppColors.textSecondary,
                tabBarActiveBackgroundColor: sidebar ? AppColors.blueBackground : undefined,
                tabBarStyle: {
                    backgroundColor: AppColors.background,
                    borderTopColor: AppColors.border,
                    borderRightColor: AppColors.border,
                    // стандартной высоты не хватает под иконку с подписью — задаём сами, с учётом «полоски» внизу iPhone
                    ...(sidebar
                        ? { minWidth: 220, paddingTop: 16 }
                        : { height: 62 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 }),
                },
                tabBarItemStyle: sidebar ? { borderRadius: 12, marginHorizontal: 8 } : undefined,
                tabBarLabelStyle: { fontWeight: '700', fontSize: sidebar ? 15 : 11 },
                sceneStyle: { backgroundColor: AppColors.background },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Главная',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Поиск',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Профиль',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: isAdmin ? 'Админ' : 'Прочее',
                    tabBarIcon: ({ color, size, focused }) => (
                        isAdmin
                            ? <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={size} color={color} />
                            : <Ionicons name="ellipsis-horizontal" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
