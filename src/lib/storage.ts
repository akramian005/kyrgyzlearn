import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store не работает в вебе — там храним в localStorage.
// typeof-проверка нужна для статического рендера веба (он идёт в Node, где localStorage нет).

export async function getStorageItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        try {
            return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        } catch {
            return null;
        }
    }
    return SecureStore.getItemAsync(key);
}

export async function setStorageItem(key: string, value: string | null): Promise<void> {
    if (Platform.OS === 'web') {
        try {
            if (typeof localStorage === 'undefined') return;
            if (value === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, value);
            }
        } catch {
            // localStorage может быть недоступен (приватный режим) — просто не сохраняем
        }
        return;
    }

    if (value === null) {
        await SecureStore.deleteItemAsync(key);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}
