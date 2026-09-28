import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, ErrorBanner, LoadingView, Muted, Page, ScreenHeader, Title } from '@/components/app-ui';
import { VideoPlayer } from '@/components/video-player';
import { AppColors } from '@/constants/app-colors';
import { useApi, useLoader } from '@/lib/hooks';

// Просмотр видео курса. Открывается из списка курса: /video/[videoId]?courseId=...
export default function VideoScreen() {
    const { videoId, courseId } = useLocalSearchParams<{ videoId: string; courseId: string }>();
    const api = useApi();

    // ссылка на файл живёт час — берём свежую при каждом открытии экрана
    const { data: video, error, loading } = useLoader(() => api.videos.get(Number(courseId), Number(videoId)));

    return (
        <View style={styles.screen}>
            <ScreenHeader title={video?.title ?? 'Видео'} />

            {loading && !video ? <LoadingView /> : (
                <Page>
                    <ErrorBanner message={error} />

                    {video ? (
                        <>
                            {video.videoUrl ? (
                                <VideoPlayer key={video.videoUrl} url={video.videoUrl} style={styles.player} />
                            ) : (
                                <EmptyState icon="videocam-off-outline" title="Видео ещё не загружено" />
                            )}

                            <Title>{video.title}</Title>
                            {video.description ? <Muted style={styles.description}>{video.description}</Muted> : null}
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
        fontSize: 16,
    },
});
