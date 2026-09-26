import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LessonScreen from '@/components/LessonScreen';

export default function HomeScreen() {
  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LessonScreen />
      </GestureHandlerRootView>
  );
}