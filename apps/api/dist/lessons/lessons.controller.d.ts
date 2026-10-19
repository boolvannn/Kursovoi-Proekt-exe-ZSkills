import { AuthUser } from '../common/types/auth-user.type';
import { CreateLectureLessonDto } from './dto/create-lecture-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateWebinarLessonDto } from './dto/create-webinar-lesson.dto';
import { ImportLessonDto } from './dto/import-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UpdateLectureLessonDto } from './dto/update-lecture-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateWebinarLessonDto } from './dto/update-webinar-lesson.dto';
import { LessonsService } from './lessons.service';
export declare class LessonsController {
    private readonly lessonsService;
    constructor(lessonsService: LessonsService);
    createLecture(user: AuthUser, dto: CreateLectureLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    getLectureById(user: AuthUser, lessonId: string): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    updateLecture(user: AuthUser, lessonId: string, dto: UpdateLectureLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    getStudentLecture(user: AuthUser, lessonId: string): Promise<{
        lesson: {
            module: {
                course: {
                    id: string;
                    title: string;
                };
                id: string;
                title: string;
                courseId: string;
            };
            lecture: {
                createdAt: Date;
                updatedAt: Date;
                lessonId: string;
                content: import("@prisma/client/runtime/library").JsonValue;
                attachments: string[];
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            orderIndex: number;
            isPublished: boolean;
            moduleId: string;
            type: import(".prisma/client").$Enums.LessonType;
            description: string | null;
        };
        progress: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.LessonProgressStatus;
            startedAt: Date | null;
            lastViewedAt: Date | null;
            completedAt: Date | null;
        } | null;
    }>;
    createWebinar(user: AuthUser, dto: CreateWebinarLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    getWebinarById(user: AuthUser, lessonId: string): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    updateWebinar(user: AuthUser, lessonId: string, dto: UpdateWebinarLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    getStudentWebinar(user: AuthUser, lessonId: string): Promise<{
        lesson: {
            module: {
                course: {
                    id: string;
                    title: string;
                };
                id: string;
                title: string;
                courseId: string;
            };
            webinar: {
                createdAt: Date;
                updatedAt: Date;
                lessonId: string;
                meetingLink: string;
                scheduledAt: Date;
                durationMinutes: number | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            orderIndex: number;
            isPublished: boolean;
            moduleId: string;
            type: import(".prisma/client").$Enums.LessonType;
            description: string | null;
        };
        progress: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.LessonProgressStatus;
            startedAt: Date | null;
            lastViewedAt: Date | null;
            completedAt: Date | null;
        } | null;
    }>;
    listStudentModuleLessons(user: AuthUser, moduleId: string): Promise<({
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    })[]>;
    listByModule(user: AuthUser, moduleId: string): Promise<({
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    })[]>;
    exportLesson(user: AuthUser, lessonId: string): Promise<import("./types/lesson-transfer.type").LessonTransferPayload>;
    importLessonToModule(user: AuthUser, moduleId: string, dto: ImportLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    getById(user: AuthUser, lessonId: string): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    create(user: AuthUser, dto: CreateLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    reorder(user: AuthUser, dto: ReorderLessonsDto): Promise<({
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    })[]>;
    update(user: AuthUser, lessonId: string, dto: UpdateLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: import("@prisma/client/runtime/library").JsonValue;
            attachments: string[];
        } | null;
        test: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        } | null;
        webinar: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            meetingLink: string;
            scheduledAt: Date;
            durationMinutes: number | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        isPublished: boolean;
        moduleId: string;
        type: import(".prisma/client").$Enums.LessonType;
        description: string | null;
    }>;
    remove(user: AuthUser, lessonId: string): Promise<{
        success: boolean;
    }>;
}
