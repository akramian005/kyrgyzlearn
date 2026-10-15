import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { BottomTabBar, Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/app-colors';

// с этой ширины (планшет, веб) панель переезжает влево, как у Duolingo на сайте
const SIDEBAR_MIN_WIDTH = 768;
// боковая панель, её подписи и значки — на 25% крупнее прежних (220px, 15px)
const SIDEBAR_SCALE = 1.25;
const LOGO_FONT = 'BalsamiqSans-Bold';

export default function TabsLayout() {
    const { width } = useWindowDimensions();
    const sidebar = width >= SIDEBAR_MIN_WIDTH;
    const insets = useSafeAreaInsets();
    // детский шрифт надписи «Илби»; пока грузится — обычный шрифт, панель не ждёт
    const [fontLoaded] = useFonts({ [LOGO_FONT]: require('@/assets/fonts/BalsamiqSans-Bold.ttf') });
    const iconSize = (size: number) => (sidebar ? Math.round(size * SIDEBAR_SCALE) : size);

    return (
        <Tabs
            // в боковой панели сверху — барсик и «Илби»
            tabBar={sidebar ? (props) => <SidebarTabBar {...props} fontLoaded={fontLoaded} /> : undefined}
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
                        // правую границу рисует обёртка SidebarTabBar — на всю высоту, вместе с логотипом
                        ? { minWidth: 220 * SIDEBAR_SCALE, paddingTop: 8, borderRightWidth: 0 }
                        : { height: 62 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 }),
                },
                tabBarItemStyle: sidebar ? { borderRadius: 12, marginHorizontal: 8 } : undefined,
                tabBarLabelStyle: { fontWeight: '700', fontSize: sidebar ? 15 * SIDEBAR_SCALE : 11 },
                sceneStyle: { backgroundColor: AppColors.background },
            }}
        >
            <Tabs.Screen
                name="(home)"
                options={{
                    title: 'Главная',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'home' : 'home-outline'} size={iconSize(size)} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="(search)"
                options={{
                    title: 'Поиск',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'search' : 'search-outline'} size={iconSize(size)} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="(profile)"
                options={{
                    title: 'Профиль',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={iconSize(size)} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="(more)"
                options={{
                    // у всех «Прочее»; у админа внутри — «Официальные курсы» вместо «Мои курсы»
                    title: 'Прочее',
                    tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={iconSize(size)} color={color} />,
                }}
            />
        </Tabs>
    );
}

// Боковая панель на ПК и планшете: сверху барсик и надпись «Илби», под ними вкладки
function SidebarTabBar({ fontLoaded, ...props }: BottomTabBarProps & { fontLoaded: boolean }) {
    return (
        <View style={styles.sidebar}>
            <View style={styles.logo}>
                <Image source={require('@/assets/images/bars-head.png')} style={styles.logoIcon} contentFit="contain" />
                <Text style={[styles.logoText, fontLoaded && { fontFamily: LOGO_FONT, fontWeight: 'normal' }]}>Илби</Text>
            </View>
            <View style={styles.tabs}>
                <BottomTabBar {...props} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        backgroundColor: AppColors.background,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: AppColors.border,
    },
    logo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 12,
    },
    logoIcon: {
        width: 48,
        height: 48,
    },
    logoText: {
        color: AppColors.blue,
        fontSize: 36,
        fontWeight: '800',
    },
    // вкладки занимают остальную высоту
    tabs: {
        flex: 1,
    },
});
