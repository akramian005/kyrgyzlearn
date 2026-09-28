import { emptyMedia, type MediaDraft } from '@/components/editor/media-field';
import type { Api } from '@/lib/api';
import { applyMedia } from '@/lib/lesson-drafts';
import type { CourseVideo } from '@/lib/types';

// Черновик видео курса в форме редактора
export type VideoDraft = {
    title: string;
    description: string;
    file: MediaDraft;
};

export const newVideoDraft = (): VideoDraft => ({ title: '', description: '', file: emptyMedia() });

export const videoToDraft = (video: CourseVideo): VideoDraft => ({
    title: video.title,
    description: video.description ?? '',
    file: emptyMedia(video.videoUrl),
});

export function validateVideo(draft: VideoDraft): string | null {
    if (!draft.title.trim()) return 'Введите название видео';
    if (!draft.file.picked && (draft.file.removed || !draft.file.url)) return 'Выберите файл видео';
    return null;
}

// original === null — создаём новое видео в конце курса
export async function saveVideo(api: Api, courseId: number, original: CourseVideo | null, draft: VideoDraft) {
    const input = { title: draft.title.trim(), description: draft.description.trim() || null };
    let videoId: number;

    if (!original) {
        videoId = (await api.videos.create(courseId, input)).id;
    } else {
        videoId = original.id;
        if (input.title !== original.title || input.description !== original.description) {
            await api.videos.update(courseId, videoId, input);
        }
    }

    await applyMedia(
        draft.file,
        (file) => api.videos.uploadFile(courseId, videoId, file),
        () => api.videos.removeFile(courseId, videoId),
    );
}
