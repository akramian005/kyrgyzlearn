import { Alert, Platform } from 'react-native';

// Alert с кнопками в вебе не работает — там используем window.confirm
export function confirmAsync(title: string, message: string, confirmLabel = 'Удалить'): Promise<boolean> {
    if (Platform.OS === 'web') {
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
            { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
        ], { cancelable: true, onDismiss: () => resolve(false) });
    });
}
