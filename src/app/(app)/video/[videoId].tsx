import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, ErrorBanner, LoadingView, OfflineState, Page, ScreenHeader, Title } from '@/components/app-ui';
import { DESCRIPTION_TEXT_STYLE, Markdown } from '@/components/markdown';
import { VideoPlayer } from '@/components/video-player';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';

// Просмотр видео курса. Открывается из списка курса: /video/[videoId]?courseId=...
export default function VideoScreen() {
    const { videoId, courseId } = useLocalSearchParams<{ videoId: string; courseId: string }>();
    const api = useApi();

    // ссылка на файл живёт час — берём свежую при каждом открытии экрана
    const { data: video, error, loading, offline, reload } = useLoader(() => api.videos.get(Number(courseId), Number(videoId)));

    // видео открыли — засчитываем как просмотренное (у видео без файла смотреть нечего)
    const hasFile = !!video?.videoUrl;
    useEffect(() => {
        if (!hasFile) return;
        api.progress.watchVideo(Number(courseId), Number(videoId)).catch(() => {
            // не мешаем смотреть: в худшем случае видео просто не отметится в прогрессе
        });
    }, [hasFile, api, courseId, videoId]);

    return (
        <View style={styles.screen}>
            <ScreenHeader title={video?.title ?? 'Видео'} />

            {loading && !video ? <LoadingView /> : (
                <Page>
                    <ErrorBanner message={error} />
                    {offline && !video ? <OfflineState onRetry={() => void reload()} /> : null}

                    {video ? (
                        <>
                            {video.videoUrl ? (
                                <VideoPlayer key={video.videoUrl} url={video.videoUrl} style={styles.player} />
                            ) : (
                                <EmptyState icon="videocam-off-outline" title="Видео ещё не загружено" />
                            )}

                            <Title>{video.title}</Title>
                            {video.description ? (
                                <View style={styles.description}>
                                    <Markdown text={video.description} style={DESCRIPTION_TEXT_STYLE} />
                                </View>
                            ) : null}
                        </>
                    ) : null}
                </Page>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    player: {
        marginBottom: 20,
    },
    description: {
        marginTop: -8,
    },
});
