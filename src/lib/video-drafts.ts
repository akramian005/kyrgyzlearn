import { emptyMedia, type MediaDraft } from '@/components/editor/media-field';
import type { Api } from '@/lib/api';
import { applyMedia } from '@/lib/lesson-drafts';
import type { CourseVideo } from '@/lib/types';

// Черновик видео курса в форме редактора. Описания у видео нет — только название и файл
export type VideoDraft = {
    title: string;
    file: MediaDraft;
};

export const newVideoDraft = (): VideoDraft => ({ title: '', file: emptyMedia() });

export const videoToDraft = (video: CourseVideo): VideoDraft => ({
    title: video.title,
    file: emptyMedia(video.videoUrl),
});

export function validateVideo(draft: VideoDraft): string | null {
    if (!draft.title.trim()) return 'Введите название видео';
    if (!draft.file.picked && (draft.file.removed || !draft.file.url)) return 'Выберите файл видео';
    return null;
}

// original === null — создаём новое видео в конце юнита unitId
export async function saveVideo(api: Api, courseId: number, original: CourseVideo | null, draft: VideoDraft, unitId?: number) {
    const input = { title: draft.title.trim(), description: null };
    let videoId: number;

    if (!original) {
        if (unitId === undefined) throw new Error('Не выбран юнит для нового видео');
        videoId = (await api.videos.create(courseId, { ...input, unitId })).id;
    } else {
        videoId = original.id;
        if (input.title !== original.title) {
            await api.videos.update(courseId, videoId, { title: input.title });
        }
    }

    await applyMedia(
        draft.file,
        (file) => api.videos.uploadFile(courseId, videoId, file),
        () => api.videos.removeFile(courseId, videoId),
    );
}
