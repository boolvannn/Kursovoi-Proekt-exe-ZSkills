import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { TestsService } from '../tests/tests.service';
import { CreateLectureLessonDto } from './dto/create-lecture-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateWebinarLessonDto } from './dto/create-webinar-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UpdateLectureLessonDto } from './dto/update-lecture-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateWebinarLessonDto } from './dto/update-webinar-lesson.dto';
import { LessonTransferPayload } from './types/lesson-transfer.type';
type LectureUploadFile = {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};
export declare class LessonsService {
    private readonly prisma;
    private readonly testsService;
    constructor(prisma: PrismaService, testsService: TestsService);
    createLecture(teacherId: string, dto: CreateLectureLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    getLectureById(teacherId: string, lessonId: string): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    updateLecture(teacherId: string, lessonId: string, dto: UpdateLectureLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    uploadLectureFiles(user: AuthUser, lessonId: string, files: LectureUploadFile[]): Promise<{
        lessonId: string;
        attachments: string[];
    }>;
    deleteLectureFile(user: AuthUser, lessonId: string, fileUrl: string): Promise<{
        lessonId: string;
        attachments: string[];
    }>;
    createWebinar(teacherId: string, dto: CreateWebinarLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    getWebinarById(teacherId: string, lessonId: string): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    updateWebinar(teacherId: string, lessonId: string, dto: UpdateWebinarLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    getWebinarByIdForStudent(studentId: string, lessonId: string): Promise<{
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
    getLectureByIdForStudent(studentId: string, lessonId: string): Promise<{
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
                content: Prisma.JsonValue;
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
    listPublishedByModuleForStudent(studentId: string, moduleId: string): Promise<({
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    listByModule(teacherId: string, moduleId: string): Promise<({
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    getById(teacherId: string, lessonId: string): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    exportLesson(teacherId: string, lessonId: string): Promise<LessonTransferPayload>;
    importLessonToModule(teacherId: string, moduleId: string, payload: unknown): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    create(teacherId: string, dto: CreateLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    update(teacherId: string, lessonId: string, dto: UpdateLessonDto): Promise<{
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    reorder(teacherId: string, dto: ReorderLessonsDto): Promise<({
        lecture: {
            createdAt: Date;
            updatedAt: Date;
            lessonId: string;
            content: Prisma.JsonValue;
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
    remove(teacherId: string, lessonId: string): Promise<{
        success: boolean;
    }>;
    private mapTestQuestionToExport;
    private parseLessonTransferPayload;
    private parseTransferredTestQuestion;
    private parseAcceptedAnswersFromJson;
    private parseMatchingPairsFromJson;
    private parseOrderingItemsFromJson;
    private assertObject;
    private assertArray;
    private assertString;
    private assertBoolean;
    private assertNumber;
    private optionalString;
    private optionalBoolean;
    private optionalInteger;
    private validateLectureFile;
    private extractLectureAttachmentFileName;
    private getManagedLectureForAttachments;
    private assertTeacherOwnsModule;
    private getOwnedLesson;
    private createTypeSpecificRecord;
    private updateTypeSpecificRecord;
    private deleteTypeSpecificRecords;
    private applyOrderIndexes;
    private parseDateOrThrow;
    private assertLectureType;
    private assertWebinarType;
}
export {};
