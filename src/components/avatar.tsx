import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/app-colors';

// Круглый аватар: картинка, а если её нет — первая буква имени (или почты)
export function Avatar({ url, name, size = 96 }: { url: string | null | undefined; name: string; size?: number }) {
    const circle = { width: size, height: size, borderRadius: size / 2 };

    if (url) {
        return <Image source={{ uri: url }} style={[styles.image, circle]} contentFit="cover" />;
    }

    return (
        <View style={[styles.placeholder, circle]}>
            <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    image: {
        backgroundColor: AppColors.surfaceRaised,
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: AppColors.blueBackground,
        borderWidth: 2,
        borderColor: AppColors.blue,
    },
    letter: {
        color: AppColors.blue,
        fontWeight: '800',
    },
});
