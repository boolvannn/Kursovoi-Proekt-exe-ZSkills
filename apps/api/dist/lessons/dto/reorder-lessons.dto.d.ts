declare class ReorderLessonItemDto {
    lessonId: string;
    orderIndex: number;
}
export declare class ReorderLessonsDto {
    moduleId: string;
    items: ReorderLessonItemDto[];
}
export {};
