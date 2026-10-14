import { useAudioPlayer } from 'expo-audio';

import { ensureAudioMode } from '@/components/audio-button';

// Звуки после проверки ответа в уроке. Плееры создаются один раз на урок,
// поэтому звук играет сразу, без задержки на загрузку файла.
export function useAnswerSounds() {
    const correct = useAudioPlayer(require('@/assets/sounds/correct.mp3'));
    const wrong = useAudioPlayer(require('@/assets/sounds/wrong.mp3'));

    return async (isCorrect: boolean) => {
        const player = isCorrect ? correct : wrong;
        // прошлый звук мог ещё не доиграть — глушим его, чтобы не накладывались
        (isCorrect ? wrong : correct).pause();
        try {
            await ensureAudioMode();
            await player.seekTo(0);
            player.play();
        } catch {
            // звук — не главное: если не сыграл, урок продолжается
        }
    };
}
