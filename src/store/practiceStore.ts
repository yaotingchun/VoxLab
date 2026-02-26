import { create } from 'zustand';

interface FileData {
    base64: string;
    name: string;
    type: string;
}

interface PracticeStore {
    lectureSlide: FileData | null;
    presentationSlide: FileData | null;
    presentationRubric: FileData | null;
    lectureMaterial: string | null;

    setLectureSlide: (data: FileData | null) => void;
    setPresentationSlide: (data: FileData | null) => void;
    setPresentationRubric: (data: FileData | null) => void;
    setLectureMaterial: (text: string | null) => void;

    clearAll: () => void;
}

export const usePracticeStore = create<PracticeStore>((set) => ({
    lectureSlide: null,
    presentationSlide: null,
    presentationRubric: null,
    lectureMaterial: null,

    setLectureSlide: (data) => set({ lectureSlide: data }),
    setPresentationSlide: (data) => set({ presentationSlide: data }),
    setPresentationRubric: (data) => set({ presentationRubric: data }),
    setLectureMaterial: (text) => set({ lectureMaterial: text }),

    clearAll: () => set({
        lectureSlide: null,
        presentationSlide: null,
        presentationRubric: null,
        lectureMaterial: null,
    })
}));
