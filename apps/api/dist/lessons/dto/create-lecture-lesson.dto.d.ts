export declare class CreateLectureLessonDto {
    moduleId: string;
    title: string;
    description?: string;
    orderIndex?: number;
    isPublished?: boolean;
    content: Record<string, unknown>;
}
