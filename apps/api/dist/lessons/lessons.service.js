"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const tests_service_1 = require("../tests/tests.service");
const lesson_transfer_type_1 = require("./types/lesson-transfer.type");
const LECTURE_FILES_DIR = (0, path_1.join)(process.cwd(), 'static', 'lecture-files');
const LECTURE_FILES_PUBLIC_PREFIX = '/static/lecture-files/';
const MAX_LECTURE_FILES = 6;
const MAX_LECTURE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_LECTURE_EXTENSIONS = new Set([
    '.doc',
    '.docx',
    '.pdf',
    '.ppt',
    '.pptx',
    '.xls',
    '.xlsx',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
]);
const ALLOWED_LECTURE_MIME_TYPES = new Set([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/webp',
]);
const lessonInclude = {
    lecture: true,
    test: true,
    webinar: true,
};
let LessonsService = class LessonsService {
    constructor(prisma, testsService) {
        this.prisma = prisma;
        this.testsService = testsService;
    }
    async createLecture(teacherId, dto) {
        return this.create(teacherId, {
            moduleId: dto.moduleId,
            type: client_1.LessonType.LECTURE,
            title: dto.title,
            description: dto.description,
            orderIndex: dto.orderIndex,
            isPublished: dto.isPublished ?? false,
            lecture: {
                content: dto.content,
            },
        });
    }
    async getLectureById(teacherId, lessonId) {
        const lesson = await this.getById(teacherId, lessonId);
        this.assertLectureType(lesson.type);
        if (!lesson.lecture) {
            throw new common_1.NotFoundException('Lecture content not found');
        }
        return lesson;
    }
    async updateLecture(teacherId, lessonId, dto) {
        const lesson = await this.getOwnedLesson(teacherId, lessonId);
        this.assertLectureType(lesson.type);
        return this.update(teacherId, lessonId, {
            title: dto.title,
            description: dto.description,
            orderIndex: dto.orderIndex,
            isPublished: dto.isPublished,
            lecture: dto.content !== undefined
                ? {
                    content: dto.content,
                }
                : undefined,
        });
    }
    async uploadLectureFiles(user, lessonId, files) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('Не выбраны файлы для загрузки.');
        }
        const managedLecture = await this.getManagedLectureForAttachments(user, lessonId);
        const existingAttachments = [...managedLecture.attachments];
        if (existingAttachments.length + files.length > MAX_LECTURE_FILES) {
            throw new common_1.BadRequestException(`Максимум ${MAX_LECTURE_FILES} файлов на одну лекцию.`);
        }
        for (const file of files) {
            this.validateLectureFile(file);
        }
        await (0, promises_1.mkdir)(LECTURE_FILES_DIR, { recursive: true });
        const createdUrls = [];
        try {
            for (const file of files) {
                const extension = (0, path_1.extname)(file.originalname).toLowerCase();
                const uniqueName = `${Date.now()}-${(0, crypto_1.randomUUID)()}${extension}`;
                const diskPath = (0, path_1.join)(LECTURE_FILES_DIR, uniqueName);
                await (0, promises_1.writeFile)(diskPath, file.buffer);
                createdUrls.push(`${LECTURE_FILES_PUBLIC_PREFIX}${uniqueName}`);
            }
            const updated = await this.prisma.$transaction(async (tx) => {
                return tx.lectureLesson.update({
                    where: { lessonId: managedLecture.lessonId },
                    data: {
                        attachments: [...existingAttachments, ...createdUrls],
                    },
                    select: {
                        lessonId: true,
                        attachments: true,
                    },
                });
            });
            return updated;
        }
        catch (error) {
            await Promise.all(createdUrls.map(async (url) => {
                const fileName = this.extractLectureAttachmentFileName(url);
                if (!fileName)
                    return;
                const diskPath = (0, path_1.join)(LECTURE_FILES_DIR, fileName);
                try {
                    await (0, promises_1.unlink)(diskPath);
                }
                catch {
                }
            }));
            throw error;
        }
    }
    async deleteLectureFile(user, lessonId, fileUrl) {
        const managedLecture = await this.getManagedLectureForAttachments(user, lessonId);
        const normalizedUrl = fileUrl.trim();
        const existingAttachments = [...managedLecture.attachments];
        if (!existingAttachments.includes(normalizedUrl)) {
            throw new common_1.NotFoundException('Файл не найден в списке вложений лекции.');
        }
        const fileName = this.extractLectureAttachmentFileName(normalizedUrl);
        if (!fileName) {
            throw new common_1.BadRequestException('Некорректный путь к файлу.');
        }
        const nextAttachments = existingAttachments.filter((item) => item !== normalizedUrl);
        await this.prisma.$transaction(async (tx) => {
            await tx.lectureLesson.update({
                where: { lessonId: managedLecture.lessonId },
                data: {
                    attachments: nextAttachments,
                },
            });
        });
        const diskPath = (0, path_1.join)(LECTURE_FILES_DIR, fileName);
        try {
            await (0, promises_1.unlink)(diskPath);
        }
        catch {
        }
        return {
            lessonId: managedLecture.lessonId,
            attachments: nextAttachments,
        };
    }
    async createWebinar(teacherId, dto) {
        return this.create(teacherId, {
            moduleId: dto.moduleId,
            type: client_1.LessonType.WEBINAR,
            title: dto.title,
            description: dto.description,
            orderIndex: dto.orderIndex,
            isPublished: dto.isPublished ?? false,
            webinar: {
                meetingLink: dto.meetingLink,
                scheduledAt: dto.scheduledAt,
                durationMinutes: dto.durationMinutes,
            },
        });
    }
    async getWebinarById(teacherId, lessonId) {
        const lesson = await this.getById(teacherId, lessonId);
        this.assertWebinarType(lesson.type);
        if (!lesson.webinar) {
            throw new common_1.NotFoundException('Webinar details not found');
        }
        return lesson;
    }
    async updateWebinar(teacherId, lessonId, dto) {
        const lesson = await this.getOwnedLesson(teacherId, lessonId);
        this.assertWebinarType(lesson.type);
        return this.update(teacherId, lessonId, {
            title: dto.title,
            description: dto.description,
            orderIndex: dto.orderIndex,
            isPublished: dto.isPublished,
            webinar: {
                meetingLink: dto.meetingLink,
                scheduledAt: dto.scheduledAt,
                durationMinutes: dto.durationMinutes,
            },
        });
    }
    async getWebinarByIdForStudent(studentId, lessonId) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                webinar: true,
                module: {
                    select: {
                        id: true,
                        title: true,
                        courseId: true,
                        course: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
            },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        this.assertWebinarType(lesson.type);
        if (!lesson.webinar) {
            throw new common_1.NotFoundException('Webinar details not found');
        }
        if (!lesson.isPublished) {
            throw new common_1.ForbiddenException('Webinar is not published');
        }
        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                courseId_studentId: {
                    courseId: lesson.module.courseId,
                    studentId,
                },
            },
            select: {
                id: true,
                status: true,
            },
        });
        if (!enrollment || enrollment.status !== client_1.EnrollmentStatus.ACTIVE) {
            throw new common_1.ForbiddenException('You are not enrolled in this course');
        }
        const progress = await this.prisma.lessonProgress.findUnique({
            where: {
                studentId_lessonId: {
                    studentId,
                    lessonId,
                },
            },
            select: {
                id: true,
                status: true,
                startedAt: true,
                lastViewedAt: true,
                completedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {
            lesson,
            progress,
        };
    }
    async getLectureByIdForStudent(studentId, lessonId) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                lecture: true,
                module: {
                    select: {
                        id: true,
                        title: true,
                        courseId: true,
                        course: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                },
            },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        this.assertLectureType(lesson.type);
        if (!lesson.lecture) {
            throw new common_1.NotFoundException('Lecture content not found');
        }
        if (!lesson.isPublished) {
            throw new common_1.ForbiddenException('Lecture is not published');
        }
        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                courseId_studentId: {
                    courseId: lesson.module.courseId,
                    studentId,
                },
            },
            select: {
                id: true,
                status: true,
            },
        });
        if (!enrollment || enrollment.status !== client_1.EnrollmentStatus.ACTIVE) {
            throw new common_1.ForbiddenException('You are not enrolled in this course');
        }
        const progress = await this.prisma.lessonProgress.findUnique({
            where: {
                studentId_lessonId: {
                    studentId,
                    lessonId,
                },
            },
            select: {
                id: true,
                status: true,
                startedAt: true,
                lastViewedAt: true,
                completedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {
            lesson,
            progress,
        };
    }
    async listPublishedByModuleForStudent(studentId, moduleId) {
        const module = await this.prisma.courseModule.findUnique({
            where: { id: moduleId },
            select: {
                courseId: true,
            },
        });
        if (!module) {
            throw new common_1.NotFoundException('Module not found');
        }
        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                courseId_studentId: {
                    courseId: module.courseId,
                    studentId,
                },
            },
            select: {
                id: true,
                status: true,
            },
        });
        if (!enrollment || enrollment.status !== client_1.EnrollmentStatus.ACTIVE) {
            throw new common_1.ForbiddenException('You are not enrolled in this course');
        }
        return this.prisma.lesson.findMany({
            where: {
                moduleId,
                isPublished: true,
            },
            orderBy: { orderIndex: 'asc' },
            include: lessonInclude,
        });
    }
    async listByModule(teacherId, moduleId) {
        await this.assertTeacherOwnsModule(teacherId, moduleId);
        return this.prisma.lesson.findMany({
            where: { moduleId },
            orderBy: { orderIndex: 'asc' },
            include: lessonInclude,
        });
    }
    async getById(teacherId, lessonId) {
        await this.getOwnedLesson(teacherId, lessonId);
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: lessonInclude,
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        return lesson;
    }
    async exportLesson(teacherId, lessonId) {
        await this.getOwnedLesson(teacherId, lessonId);
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                lecture: true,
                test: {
                    include: {
                        questions: {
                            orderBy: { order: 'asc' },
                            include: {
                                options: {
                                    orderBy: { order: 'asc' },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        if (lesson.type === client_1.LessonType.LECTURE) {
            if (!lesson.lecture) {
                throw new common_1.NotFoundException('Lecture content not found');
            }
            return {
                format: lesson_transfer_type_1.LESSON_TRANSFER_FORMAT,
                version: lesson_transfer_type_1.LESSON_TRANSFER_VERSION,
                lessonType: 'lecture',
                lesson: {
                    title: lesson.title,
                    description: lesson.description ?? undefined,
                    orderIndex: lesson.orderIndex,
                    isPublished: lesson.isPublished,
                },
                lecture: {
                    content: lesson.lecture.content,
                },
            };
        }
        if (lesson.type === client_1.LessonType.TEST) {
            if (!lesson.test) {
                throw new common_1.NotFoundException('Test settings not found');
            }
            const questions = lesson.test.questions.map((question) => this.mapTestQuestionToExport(question));
            return {
                format: lesson_transfer_type_1.LESSON_TRANSFER_FORMAT,
                version: lesson_transfer_type_1.LESSON_TRANSFER_VERSION,
                lessonType: 'test',
                lesson: {
                    title: lesson.title,
                    description: lesson.description ?? undefined,
                    orderIndex: lesson.orderIndex,
                    isPublished: lesson.isPublished,
                },
                test: {
                    settings: {
                        passingScore: lesson.test.passingScore ?? undefined,
                        allowMultipleAttempts: lesson.test.allowMultipleAttempts,
                        maxAttempts: lesson.test.maxAttempts ?? undefined,
                        timeLimitMinutes: lesson.test.timeLimitMinutes ?? undefined,
                    },
                    questions,
                },
            };
        }
        throw new common_1.BadRequestException('Only lecture and test lessons can be exported');
    }
    async importLessonToModule(teacherId, moduleId, payload) {
        await this.assertTeacherOwnsModule(teacherId, moduleId);
        const parsed = this.parseLessonTransferPayload(payload);
        if (parsed.lessonType === 'lecture') {
            return this.create(teacherId, {
                moduleId,
                type: client_1.LessonType.LECTURE,
                title: parsed.lesson.title,
                description: parsed.lesson.description,
                orderIndex: parsed.lesson.orderIndex,
                isPublished: parsed.lesson.isPublished ?? false,
                lecture: {
                    content: parsed.lecture.content,
                },
            });
        }
        const created = await this.create(teacherId, {
            moduleId,
            type: client_1.LessonType.TEST,
            title: parsed.lesson.title,
            description: parsed.lesson.description,
            orderIndex: parsed.lesson.orderIndex,
            isPublished: parsed.lesson.isPublished ?? false,
            test: {
                passingScore: parsed.test.settings.passingScore,
                allowMultipleAttempts: parsed.test.settings.allowMultipleAttempts ?? true,
                maxAttempts: parsed.test.settings.maxAttempts,
                timeLimitMinutes: parsed.test.settings.timeLimitMinutes,
            },
        });
        const upsertDto = {
            passingScore: parsed.test.settings.passingScore,
            allowMultipleAttempts: parsed.test.settings.allowMultipleAttempts ?? true,
            maxAttempts: parsed.test.settings.maxAttempts,
            timeLimitMinutes: parsed.test.settings.timeLimitMinutes,
            questions: parsed.test.questions.map((question) => ({
                text: question.text,
                explanation: question.explanation,
                type: question.type,
                points: question.points,
                options: question.options?.map((option) => ({
                    text: option.text,
                    isCorrect: option.isCorrect,
                })),
                acceptedAnswers: question.acceptedAnswers,
                matchingPairs: question.matchingPairs?.map((pair) => ({
                    left: pair.left,
                    right: pair.right,
                })),
                orderingItems: question.orderingItems?.map((item) => ({
                    text: item,
                })),
            })),
        };
        await this.testsService.upsertLessonTestContentForTeacher(teacherId, created.id, upsertDto);
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: created.id },
            include: lessonInclude,
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found after import');
        }
        return lesson;
    }
    async create(teacherId, dto) {
        await this.assertTeacherOwnsModule(teacherId, dto.moduleId);
        const existing = await this.prisma.lesson.findMany({
            where: { moduleId: dto.moduleId },
            orderBy: { orderIndex: 'asc' },
            select: { id: true },
        });
        const nextOrderIndex = existing.length + 1;
        const targetOrderIndex = dto.orderIndex
            ? Math.max(1, Math.min(dto.orderIndex, nextOrderIndex))
            : nextOrderIndex;
        return this.prisma.$transaction(async (tx) => {
            const lesson = await tx.lesson.create({
                data: {
                    moduleId: dto.moduleId,
                    type: dto.type,
                    title: dto.title,
                    description: dto.description,
                    orderIndex: nextOrderIndex,
                    isPublished: dto.isPublished ?? false,
                },
            });
            await this.createTypeSpecificRecord(tx, lesson.id, dto.type, {
                lecture: dto.lecture,
                test: dto.test,
                webinar: dto.webinar,
            });
            if (targetOrderIndex !== nextOrderIndex) {
                const reorderedIds = [...existing.map((item) => item.id)];
                reorderedIds.splice(targetOrderIndex - 1, 0, lesson.id);
                await this.applyOrderIndexes(tx, dto.moduleId, reorderedIds);
            }
            const created = await tx.lesson.findUnique({
                where: { id: lesson.id },
                include: lessonInclude,
            });
            if (!created) {
                throw new common_1.NotFoundException('Lesson not found after creation');
            }
            return created;
        });
    }
    async update(teacherId, lessonId, dto) {
        const ownedLesson = await this.getOwnedLesson(teacherId, lessonId);
        const nextType = dto.type ?? ownedLesson.type;
        return this.prisma.$transaction(async (tx) => {
            if (dto.orderIndex !== undefined) {
                const lessons = await tx.lesson.findMany({
                    where: { moduleId: ownedLesson.moduleId },
                    orderBy: { orderIndex: 'asc' },
                    select: { id: true },
                });
                const boundedTarget = Math.max(1, Math.min(dto.orderIndex, lessons.length));
                const reorderedIds = lessons
                    .map((item) => item.id)
                    .filter((id) => id !== lessonId);
                reorderedIds.splice(boundedTarget - 1, 0, lessonId);
                await this.applyOrderIndexes(tx, ownedLesson.moduleId, reorderedIds);
            }
            await tx.lesson.update({
                where: { id: lessonId },
                data: {
                    type: nextType,
                    title: dto.title,
                    description: dto.description,
                    isPublished: dto.isPublished,
                },
            });
            if (nextType !== ownedLesson.type) {
                await this.deleteTypeSpecificRecords(tx, lessonId);
                await this.createTypeSpecificRecord(tx, lessonId, nextType, {
                    lecture: dto.lecture,
                    test: dto.test,
                    webinar: dto.webinar,
                });
            }
            else {
                await this.updateTypeSpecificRecord(tx, lessonId, nextType, {
                    lecture: dto.lecture,
                    test: dto.test,
                    webinar: dto.webinar,
                });
            }
            const updated = await tx.lesson.findUnique({
                where: { id: lessonId },
                include: lessonInclude,
            });
            if (!updated) {
                throw new common_1.NotFoundException('Lesson not found after update');
            }
            return updated;
        });
    }
    async reorder(teacherId, dto) {
        await this.assertTeacherOwnsModule(teacherId, dto.moduleId);
        const lessons = await this.prisma.lesson.findMany({
            where: { moduleId: dto.moduleId },
            select: { id: true },
            orderBy: { orderIndex: 'asc' },
        });
        if (lessons.length !== dto.items.length) {
            throw new common_1.BadRequestException('Reorder payload must include all module lessons');
        }
        const lessonIds = lessons.map((item) => item.id);
        const payloadIds = dto.items.map((item) => item.lessonId);
        const hasDuplicates = new Set(payloadIds).size !== payloadIds.length;
        if (hasDuplicates) {
            throw new common_1.BadRequestException('Reorder payload contains duplicate lesson IDs');
        }
        const orderIndexes = dto.items.map((item) => item.orderIndex);
        const hasDuplicateOrderIndexes = new Set(orderIndexes).size !== orderIndexes.length;
        if (hasDuplicateOrderIndexes) {
            throw new common_1.BadRequestException('Reorder payload contains duplicate order indexes');
        }
        const allBelongToModule = payloadIds.every((id) => lessonIds.includes(id));
        if (!allBelongToModule) {
            throw new common_1.BadRequestException('Reorder payload contains foreign lesson IDs');
        }
        const orderedLessonIds = [...dto.items]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((item) => item.lessonId);
        await this.prisma.$transaction(async (tx) => {
            await this.applyOrderIndexes(tx, dto.moduleId, orderedLessonIds);
        });
        return this.prisma.lesson.findMany({
            where: { moduleId: dto.moduleId },
            orderBy: { orderIndex: 'asc' },
            include: lessonInclude,
        });
    }
    async remove(teacherId, lessonId) {
        const ownedLesson = await this.getOwnedLesson(teacherId, lessonId);
        await this.prisma.$transaction(async (tx) => {
            await tx.lesson.delete({
                where: { id: lessonId },
            });
            const remaining = await tx.lesson.findMany({
                where: { moduleId: ownedLesson.moduleId },
                orderBy: { orderIndex: 'asc' },
                select: { id: true },
            });
            await this.applyOrderIndexes(tx, ownedLesson.moduleId, remaining.map((item) => item.id));
        });
        return { success: true };
    }
    mapTestQuestionToExport(question) {
        const base = {
            text: question.text,
            explanation: question.explanation ?? undefined,
            type: question.type,
            points: question.points,
        };
        if (question.type === client_1.QuestionType.SINGLE_CHOICE ||
            question.type === client_1.QuestionType.MULTIPLE_CHOICE) {
            base.options = question.options
                .sort((a, b) => a.order - b.order)
                .map((option) => ({
                text: option.text,
                isCorrect: option.isCorrect,
            }));
            return base;
        }
        if (question.type === client_1.QuestionType.FREE_TEXT) {
            base.acceptedAnswers = this.parseAcceptedAnswersFromJson(question.freeTextAcceptedAnswers);
            return base;
        }
        if (question.type === client_1.QuestionType.MATCHING) {
            base.matchingPairs = this.parseMatchingPairsFromJson(question.matchingPairs);
            return base;
        }
        base.orderingItems = this.parseOrderingItemsFromJson(question.orderingItems);
        return base;
    }
    parseLessonTransferPayload(payload) {
        const root = this.assertObject(payload, 'payload');
        const format = this.assertString(root.format, 'format');
        if (format !== lesson_transfer_type_1.LESSON_TRANSFER_FORMAT) {
            throw new common_1.BadRequestException(`Unsupported lesson import format: ${format}`);
        }
        const version = this.assertNumber(root.version, 'version');
        if (version !== lesson_transfer_type_1.LESSON_TRANSFER_VERSION) {
            throw new common_1.BadRequestException(`Unsupported lesson import version: ${version}`);
        }
        const lessonType = this.assertString(root.lessonType, 'lessonType');
        if (lessonType !== 'lecture' && lessonType !== 'test') {
            throw new common_1.BadRequestException('lessonType must be "lecture" or "test"');
        }
        const lessonRaw = this.assertObject(root.lesson, 'lesson');
        const lesson = {
            title: this.assertString(lessonRaw.title, 'lesson.title').trim(),
            description: this.optionalString(lessonRaw.description, 'lesson.description')?.trim(),
            orderIndex: this.optionalInteger(lessonRaw.orderIndex, 'lesson.orderIndex'),
            isPublished: this.optionalBoolean(lessonRaw.isPublished, 'lesson.isPublished'),
        };
        if (lesson.title.length < 2) {
            throw new common_1.BadRequestException('lesson.title must be at least 2 characters');
        }
        if (lesson.orderIndex !== undefined && lesson.orderIndex < 1) {
            throw new common_1.BadRequestException('lesson.orderIndex must be >= 1');
        }
        if (lessonType === 'lecture') {
            const lectureRaw = this.assertObject(root.lecture, 'lecture');
            const content = this.assertObject(lectureRaw.content, 'lecture.content');
            return {
                format: lesson_transfer_type_1.LESSON_TRANSFER_FORMAT,
                version: lesson_transfer_type_1.LESSON_TRANSFER_VERSION,
                lessonType: 'lecture',
                lesson,
                lecture: {
                    content,
                },
            };
        }
        const testRaw = this.assertObject(root.test, 'test');
        const settingsRaw = this.assertObject(testRaw.settings, 'test.settings');
        const questionsRaw = this.assertArray(testRaw.questions, 'test.questions');
        if (questionsRaw.length === 0) {
            throw new common_1.BadRequestException('test.questions must contain at least one item');
        }
        const settings = {
            passingScore: this.optionalInteger(settingsRaw.passingScore, 'test.settings.passingScore'),
            allowMultipleAttempts: this.optionalBoolean(settingsRaw.allowMultipleAttempts, 'test.settings.allowMultipleAttempts'),
            maxAttempts: this.optionalInteger(settingsRaw.maxAttempts, 'test.settings.maxAttempts'),
            timeLimitMinutes: this.optionalInteger(settingsRaw.timeLimitMinutes, 'test.settings.timeLimitMinutes'),
        };
        if (settings.passingScore !== undefined && settings.passingScore < 0) {
            throw new common_1.BadRequestException('test.settings.passingScore must be >= 0');
        }
        if (settings.maxAttempts !== undefined && settings.maxAttempts < 1) {
            throw new common_1.BadRequestException('test.settings.maxAttempts must be >= 1');
        }
        if (settings.timeLimitMinutes !== undefined &&
            settings.timeLimitMinutes < 1) {
            throw new common_1.BadRequestException('test.settings.timeLimitMinutes must be >= 1');
        }
        const questions = questionsRaw.map((item, index) => this.parseTransferredTestQuestion(item, index));
        return {
            format: lesson_transfer_type_1.LESSON_TRANSFER_FORMAT,
            version: lesson_transfer_type_1.LESSON_TRANSFER_VERSION,
            lessonType: 'test',
            lesson,
            test: {
                settings,
                questions,
            },
        };
    }
    parseTransferredTestQuestion(value, index) {
        const question = this.assertObject(value, `test.questions[${index}]`);
        const typeValue = this.assertString(question.type, `test.questions[${index}].type`);
        const supportedTypes = new Set([
            client_1.QuestionType.SINGLE_CHOICE,
            client_1.QuestionType.MULTIPLE_CHOICE,
            client_1.QuestionType.FREE_TEXT,
            client_1.QuestionType.MATCHING,
            client_1.QuestionType.ORDERING,
        ]);
        if (!supportedTypes.has(typeValue)) {
            throw new common_1.BadRequestException(`test.questions[${index}].type is not supported`);
        }
        const parsed = {
            text: this.assertString(question.text, `test.questions[${index}].text`).trim(),
            explanation: this.optionalString(question.explanation, `test.questions[${index}].explanation`)?.trim(),
            type: typeValue,
            points: this.optionalInteger(question.points, `test.questions[${index}].points`) ?? 1,
        };
        if (parsed.text.length < 2) {
            throw new common_1.BadRequestException(`test.questions[${index}].text must be at least 2 characters`);
        }
        if ((parsed.points ?? 1) < 1) {
            throw new common_1.BadRequestException(`test.questions[${index}].points must be >= 1`);
        }
        if (parsed.type === client_1.QuestionType.SINGLE_CHOICE || parsed.type === client_1.QuestionType.MULTIPLE_CHOICE) {
            const options = this.assertArray(question.options, `test.questions[${index}].options`).map((item, optionIndex) => {
                const option = this.assertObject(item, `test.questions[${index}].options[${optionIndex}]`);
                return {
                    text: this.assertString(option.text, `test.questions[${index}].options[${optionIndex}].text`).trim(),
                    isCorrect: this.assertBoolean(option.isCorrect, `test.questions[${index}].options[${optionIndex}].isCorrect`),
                };
            });
            if (options.length < 2) {
                throw new common_1.BadRequestException(`test.questions[${index}].options must contain at least two options`);
            }
            if (options.some((option) => option.text.length === 0)) {
                throw new common_1.BadRequestException(`test.questions[${index}].options contains empty text`);
            }
            const correctCount = options.filter((option) => option.isCorrect).length;
            if (correctCount === 0) {
                throw new common_1.BadRequestException(`test.questions[${index}] must have at least one correct option`);
            }
            if (parsed.type === client_1.QuestionType.SINGLE_CHOICE && correctCount !== 1) {
                throw new common_1.BadRequestException(`test.questions[${index}] must have exactly one correct option`);
            }
            if (parsed.type === client_1.QuestionType.MULTIPLE_CHOICE && correctCount < 2) {
                throw new common_1.BadRequestException(`test.questions[${index}] must have at least two correct options`);
            }
            parsed.options = options;
            return parsed;
        }
        if (parsed.type === client_1.QuestionType.FREE_TEXT) {
            const acceptedAnswers = this.assertArray(question.acceptedAnswers, `test.questions[${index}].acceptedAnswers`)
                .map((item, answerIndex) => this.assertString(item, `test.questions[${index}].acceptedAnswers[${answerIndex}]`).trim())
                .filter((item) => item.length > 0);
            if (acceptedAnswers.length === 0) {
                throw new common_1.BadRequestException(`test.questions[${index}] must have at least one accepted answer`);
            }
            parsed.acceptedAnswers = acceptedAnswers;
            return parsed;
        }
        if (parsed.type === client_1.QuestionType.MATCHING) {
            const matchingPairs = this.assertArray(question.matchingPairs, `test.questions[${index}].matchingPairs`).map((item, pairIndex) => {
                const pair = this.assertObject(item, `test.questions[${index}].matchingPairs[${pairIndex}]`);
                return {
                    left: this.assertString(pair.left, `test.questions[${index}].matchingPairs[${pairIndex}].left`).trim(),
                    right: this.assertString(pair.right, `test.questions[${index}].matchingPairs[${pairIndex}].right`).trim(),
                };
            });
            if (matchingPairs.length < 2) {
                throw new common_1.BadRequestException(`test.questions[${index}].matchingPairs must contain at least two pairs`);
            }
            if (matchingPairs.some((pair) => pair.left.length === 0 || pair.right.length === 0)) {
                throw new common_1.BadRequestException(`test.questions[${index}].matchingPairs contains empty values`);
            }
            parsed.matchingPairs = matchingPairs;
            return parsed;
        }
        const orderingItems = this.assertArray(question.orderingItems, `test.questions[${index}].orderingItems`)
            .map((item, itemIndex) => this.assertString(item, `test.questions[${index}].orderingItems[${itemIndex}]`).trim())
            .filter((item) => item.length > 0);
        if (orderingItems.length < 2) {
            throw new common_1.BadRequestException(`test.questions[${index}].orderingItems must contain at least two items`);
        }
        parsed.orderingItems = orderingItems;
        return parsed;
    }
    parseAcceptedAnswersFromJson(value) {
        if (!Array.isArray(value))
            return [];
        return value
            .filter((item) => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }
    parseMatchingPairsFromJson(value) {
        if (!Array.isArray(value))
            return [];
        return value
            .map((item) => {
            if (!item || typeof item !== 'object')
                return null;
            const entry = item;
            const left = typeof entry.left === 'string' ? entry.left.trim() : '';
            const right = typeof entry.right === 'string' ? entry.right.trim() : '';
            if (!left || !right)
                return null;
            return { left, right };
        })
            .filter((item) => Boolean(item));
    }
    parseOrderingItemsFromJson(value) {
        if (!Array.isArray(value))
            return [];
        return value
            .map((item) => {
            if (typeof item === 'string')
                return item.trim();
            if (!item || typeof item !== 'object')
                return '';
            const entry = item;
            return typeof entry.text === 'string' ? entry.text.trim() : '';
        })
            .filter((item) => item.length > 0);
    }
    assertObject(value, path) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new common_1.BadRequestException(`${path} must be an object`);
        }
        return value;
    }
    assertArray(value, path) {
        if (!Array.isArray(value)) {
            throw new common_1.BadRequestException(`${path} must be an array`);
        }
        return value;
    }
    assertString(value, path) {
        if (typeof value !== 'string') {
            throw new common_1.BadRequestException(`${path} must be a string`);
        }
        return value;
    }
    assertBoolean(value, path) {
        if (typeof value !== 'boolean') {
            throw new common_1.BadRequestException(`${path} must be a boolean`);
        }
        return value;
    }
    assertNumber(value, path) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new common_1.BadRequestException(`${path} must be a finite number`);
        }
        return value;
    }
    optionalString(value, path) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return this.assertString(value, path);
    }
    optionalBoolean(value, path) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return this.assertBoolean(value, path);
    }
    optionalInteger(value, path) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const numeric = this.assertNumber(value, path);
        if (!Number.isInteger(numeric)) {
            throw new common_1.BadRequestException(`${path} must be an integer`);
        }
        return numeric;
    }
    validateLectureFile(file) {
        const extension = (0, path_1.extname)(file.originalname).toLowerCase();
        if (!ALLOWED_LECTURE_EXTENSIONS.has(extension)) {
            throw new common_1.BadRequestException(`Недопустимый тип файла: ${file.originalname}`);
        }
        if (file.size > MAX_LECTURE_FILE_SIZE_BYTES) {
            throw new common_1.BadRequestException(`Файл ${file.originalname} превышает 20 МБ.`);
        }
        if (!ALLOWED_LECTURE_MIME_TYPES.has(file.mimetype)) {
            throw new common_1.BadRequestException(`Недопустимый MIME-тип файла: ${file.originalname}`);
        }
    }
    extractLectureAttachmentFileName(fileUrl) {
        if (!fileUrl.startsWith(LECTURE_FILES_PUBLIC_PREFIX)) {
            return null;
        }
        const fileName = fileUrl.slice(LECTURE_FILES_PUBLIC_PREFIX.length);
        if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
            return null;
        }
        return fileName;
    }
    async getManagedLectureForAttachments(user, lessonId) {
        const lectureLesson = await this.prisma.lectureLesson.findUnique({
            where: { lessonId },
            select: {
                lessonId: true,
                attachments: true,
                lesson: {
                    select: {
                        id: true,
                        type: true,
                        module: {
                            select: {
                                course: {
                                    select: {
                                        teacherId: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!lectureLesson || !lectureLesson.lesson) {
            throw new common_1.NotFoundException('Лекция не найдена');
        }
        if (lectureLesson.lesson.type !== client_1.LessonType.LECTURE) {
            throw new common_1.BadRequestException('Урок не является лекцией');
        }
        if (user.role === client_1.UserRole.TEACHER &&
            lectureLesson.lesson.module.course.teacherId !== user.userId) {
            throw new common_1.ForbiddenException('Можно изменять файлы только в своих курсах');
        }
        if (user.role !== client_1.UserRole.TEACHER && user.role !== client_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Недостаточно прав для изменения файлов лекции');
        }
        return lectureLesson;
    }
    async assertTeacherOwnsModule(teacherId, moduleId) {
        const module = await this.prisma.courseModule.findUnique({
            where: { id: moduleId },
            include: {
                course: {
                    select: {
                        teacherId: true,
                    },
                },
            },
        });
        if (!module) {
            throw new common_1.NotFoundException('Module not found');
        }
        if (module.course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can manage lessons only in your own courses');
        }
    }
    async getOwnedLesson(teacherId, lessonId) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                module: {
                    include: {
                        course: {
                            select: { teacherId: true },
                        },
                    },
                },
            },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        if (lesson.module.course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can manage only your own lessons');
        }
        return {
            id: lesson.id,
            moduleId: lesson.moduleId,
            type: lesson.type,
        };
    }
    async createTypeSpecificRecord(tx, lessonId, type, payload) {
        if (type === client_1.LessonType.LECTURE) {
            await tx.lectureLesson.create({
                data: {
                    lessonId,
                    content: payload.lecture?.content ?? { blocks: [] },
                },
            });
            return;
        }
        if (type === client_1.LessonType.TEST) {
            await tx.testLesson.create({
                data: {
                    lessonId,
                    passingScore: payload.test?.passingScore,
                    allowMultipleAttempts: payload.test?.allowMultipleAttempts ?? true,
                    maxAttempts: payload.test?.maxAttempts,
                    timeLimitMinutes: payload.test?.timeLimitMinutes,
                },
            });
            return;
        }
        if (type === client_1.LessonType.WEBINAR) {
            if (!payload.webinar?.meetingLink || !payload.webinar?.scheduledAt) {
                throw new common_1.BadRequestException('Webinar lesson requires meetingLink and scheduledAt');
            }
            await tx.webinarLesson.create({
                data: {
                    lessonId,
                    meetingLink: payload.webinar.meetingLink,
                    scheduledAt: this.parseDateOrThrow(payload.webinar.scheduledAt),
                    durationMinutes: payload.webinar.durationMinutes,
                },
            });
        }
    }
    async updateTypeSpecificRecord(tx, lessonId, type, payload) {
        if (type === client_1.LessonType.LECTURE && payload.lecture) {
            await tx.lectureLesson.upsert({
                where: { lessonId },
                create: {
                    lessonId,
                    content: payload.lecture.content,
                },
                update: {
                    content: payload.lecture.content,
                },
            });
            return;
        }
        if (type === client_1.LessonType.TEST && payload.test) {
            await tx.testLesson.upsert({
                where: { lessonId },
                create: {
                    lessonId,
                    passingScore: payload.test.passingScore,
                    allowMultipleAttempts: payload.test.allowMultipleAttempts ?? true,
                    maxAttempts: payload.test.maxAttempts,
                    timeLimitMinutes: payload.test.timeLimitMinutes,
                },
                update: {
                    passingScore: payload.test.passingScore,
                    allowMultipleAttempts: payload.test.allowMultipleAttempts,
                    maxAttempts: payload.test.maxAttempts,
                    timeLimitMinutes: payload.test.timeLimitMinutes,
                },
            });
            return;
        }
        if (type === client_1.LessonType.WEBINAR && payload.webinar) {
            const existing = await tx.webinarLesson.findUnique({
                where: { lessonId },
                select: { lessonId: true },
            });
            if (existing) {
                await tx.webinarLesson.update({
                    where: { lessonId },
                    data: {
                        meetingLink: payload.webinar.meetingLink,
                        scheduledAt: payload.webinar.scheduledAt
                            ? this.parseDateOrThrow(payload.webinar.scheduledAt)
                            : undefined,
                        durationMinutes: payload.webinar.durationMinutes,
                    },
                });
                return;
            }
            if (!payload.webinar.meetingLink || !payload.webinar.scheduledAt) {
                throw new common_1.BadRequestException('Webinar lesson requires meetingLink and scheduledAt');
            }
            await tx.webinarLesson.create({
                data: {
                    lessonId,
                    meetingLink: payload.webinar.meetingLink,
                    scheduledAt: this.parseDateOrThrow(payload.webinar.scheduledAt),
                    durationMinutes: payload.webinar.durationMinutes,
                },
            });
        }
    }
    async deleteTypeSpecificRecords(tx, lessonId) {
        await tx.lectureLesson.deleteMany({
            where: { lessonId },
        });
        await tx.testLesson.deleteMany({
            where: { lessonId },
        });
        await tx.webinarLesson.deleteMany({
            where: { lessonId },
        });
    }
    async applyOrderIndexes(tx, moduleId, orderedLessonIds) {
        for (let i = 0; i < orderedLessonIds.length; i += 1) {
            await tx.lesson.update({
                where: { id: orderedLessonIds[i] },
                data: { orderIndex: 10_000 + i },
            });
        }
        for (let i = 0; i < orderedLessonIds.length; i += 1) {
            await tx.lesson.update({
                where: { id: orderedLessonIds[i] },
                data: { orderIndex: i + 1 },
            });
        }
        const normalized = await tx.lesson.findMany({
            where: { moduleId },
            orderBy: { orderIndex: 'asc' },
            select: { id: true },
        });
        if (normalized.length !== orderedLessonIds.length) {
            throw new common_1.BadRequestException('Failed to apply order indexes consistently');
        }
    }
    parseDateOrThrow(value) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException('Invalid date format');
        }
        return parsed;
    }
    assertLectureType(type) {
        if (type !== client_1.LessonType.LECTURE) {
            throw new common_1.BadRequestException('Lesson is not a lecture');
        }
    }
    assertWebinarType(type) {
        if (type !== client_1.LessonType.WEBINAR) {
            throw new common_1.BadRequestException('Lesson is not a webinar');
        }
    }
};
exports.LessonsService = LessonsService;
exports.LessonsService = LessonsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tests_service_1.TestsService])
], LessonsService);
//# sourceMappingURL=lessons.service.js.map