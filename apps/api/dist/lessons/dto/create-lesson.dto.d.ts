import { LessonType } from '@prisma/client';
declare class LecturePayloadDto {
    content: Record<string, unknown>;
}
declare class TestPayloadDto {
    passingScore?: number;
    allowMultipleAttempts?: boolean;
    maxAttempts?: number;
    timeLimitMinutes?: number;
}
declare class WebinarPayloadDto {
    meetingLink: string;
    scheduledAt: string;
    durationMinutes?: number;
}
export declare class CreateLessonDto {
    moduleId: string;
    type: LessonType;
    title: string;
    description?: string;
    orderIndex?: number;
    isPublished?: boolean;
    lecture?: LecturePayloadDto;
    test?: TestPayloadDto;
    webinar?: WebinarPayloadDto;
}
export {};
