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
exports.TestsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let TestsService = class TestsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLessonTestContentForTeacher(teacherId, lessonId) {
        await this.getOwnedTestLessonForTeacher(teacherId, lessonId);
        const testLesson = await this.prisma.testLesson.findUnique({
            where: { lessonId },
            include: {
                lesson: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        isPublished: true,
                        orderIndex: true,
                        moduleId: true,
                    },
                },
                questions: {
                    orderBy: { order: 'asc' },
                    include: {
                        options: {
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
        });
        if (!testLesson) {
            throw new common_1.NotFoundException('Test lesson content not found');
        }
        return this.mapTeacherTestContent(testLesson);
    }
    async upsertLessonTestContentForTeacher(teacherId, lessonId, dto) {
        await this.getOwnedTestLessonForTeacher(teacherId, lessonId);
        this.validateTestContent(dto);
        await this.prisma.$transaction(async (tx) => {
            const attemptsCount = await tx.testAttempt.count({
                where: { testLessonId: lessonId },
            });
            if (attemptsCount > 0) {
                throw new common_1.BadRequestException('Cannot edit test questions after students started attempts');
            }
            await tx.testLesson.upsert({
                where: { lessonId },
                create: {
                    lessonId,
                    passingScore: dto.passingScore,
                    allowMultipleAttempts: dto.allowMultipleAttempts ?? true,
                    maxAttempts: dto.maxAttempts,
                    timeLimitMinutes: dto.timeLimitMinutes,
                },
                update: {
                    passingScore: dto.passingScore,
                    allowMultipleAttempts: dto.allowMultipleAttempts ?? true,
                    maxAttempts: dto.maxAttempts,
                    timeLimitMinutes: dto.timeLimitMinutes,
                },
            });
            const existingQuestions = await tx.testQuestion.findMany({
                where: { testLessonId: lessonId },
                select: { id: true },
            });
            const existingQuestionIds = existingQuestions.map((item) => item.id);
            if (existingQuestionIds.length > 0) {
                await tx.testQuestionOption.deleteMany({
                    where: {
                        questionId: {
                            in: existingQuestionIds,
                        },
                    },
                });
                await tx.testQuestion.deleteMany({
                    where: {
                        id: {
                            in: existingQuestionIds,
                        },
                    },
                });
            }
            for (let questionIndex = 0; questionIndex < dto.questions.length; questionIndex += 1) {
                const question = dto.questions[questionIndex];
                const prepared = this.prepareQuestionContentForPersistence(question);
                const createdQuestion = await tx.testQuestion.create({
                    data: {
                        testLessonId: lessonId,
                        text: question.text,
                        explanation: question.explanation,
                        type: question.type,
                        order: questionIndex + 1,
                        points: question.points ?? 1,
                        freeTextAcceptedAnswers: prepared.acceptedAnswers ?? undefined,
                        matchingPairs: prepared.matchingPairs ?? undefined,
                        orderingItems: prepared.orderingItems ?? undefined,
                    },
                });
                if (prepared.options.length > 0) {
                    await tx.testQuestionOption.createMany({
                        data: prepared.options.map((option, optionIndex) => ({
                            questionId: createdQuestion.id,
                            text: option.text,
                            isCorrect: option.isCorrect,
                            order: optionIndex + 1,
                        })),
                    });
                }
            }
        });
        return this.getLessonTestContentForTeacher(teacherId, lessonId);
    }
    async getStudentTestForPassing(studentId, lessonId) {
        const context = await this.getStudentTestContext(studentId, lessonId);
        await this.finalizeExpiredAttemptsForStudentLesson(studentId, lessonId, context.testLesson.timeLimitMinutes);
        const questions = await this.prisma.testQuestion.findMany({
            where: {
                testLessonId: lessonId,
            },
            orderBy: { order: 'asc' },
            select: {
                id: true,
                text: true,
                explanation: true,
                type: true,
                order: true,
                points: true,
                freeTextAcceptedAnswers: true,
                matchingPairs: true,
                orderingItems: true,
                options: {
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        text: true,
                        order: true,
                    },
                },
            },
        });
        const mappedQuestions = questions.map((question) => {
            if (question.type === client_1.QuestionType.MATCHING) {
                const matchingPairs = this.parseMatchingPairs(question.matchingPairs);
                return {
                    id: question.id,
                    text: question.text,
                    explanation: question.explanation,
                    type: question.type,
                    order: question.order,
                    points: question.points,
                    options: [],
                    matchingLeftItems: matchingPairs.map((pair) => ({
                        id: pair.leftId,
                        text: pair.left,
                    })),
                    matchingRightItems: this.shuffleArray(matchingPairs.map((pair) => ({
                        id: pair.rightId,
                        text: pair.right,
                    }))),
                };
            }
            if (question.type === client_1.QuestionType.ORDERING) {
                const orderingItems = this.parseOrderingItems(question.orderingItems);
                return {
                    id: question.id,
                    text: question.text,
                    explanation: question.explanation,
                    type: question.type,
                    order: question.order,
                    points: question.points,
                    options: [],
                    orderingItems: this.shuffleArray(orderingItems),
                };
            }
            if (question.type === client_1.QuestionType.FREE_TEXT) {
                return {
                    id: question.id,
                    text: question.text,
                    explanation: question.explanation,
                    type: question.type,
                    order: question.order,
                    points: question.points,
                    options: [],
                };
            }
            return {
                id: question.id,
                text: question.text,
                explanation: question.explanation,
                type: question.type,
                order: question.order,
                points: question.points,
                options: question.options,
            };
        });
        const rawAttempts = await this.prisma.testAttempt.findMany({
            where: {
                studentId,
                testLessonId: lessonId,
            },
            orderBy: { attemptNumber: 'desc' },
            select: {
                id: true,
                attemptNumber: true,
                status: true,
                score: true,
                maxScore: true,
                scorePercent: true,
                isPassed: true,
                startedAt: true,
                submittedAt: true,
            },
        });
        const attempts = rawAttempts.map((attempt) => this.mapAttemptWithExpiresAt(attempt, context.testLesson.timeLimitMinutes));
        return {
            lesson: {
                id: context.testLesson.lesson.id,
                title: context.testLesson.lesson.title,
                description: context.testLesson.lesson.description,
                module: {
                    id: context.testLesson.lesson.module.id,
                    title: context.testLesson.lesson.module.title,
                    courseId: context.testLesson.lesson.module.course.id,
                    courseTitle: context.testLesson.lesson.module.course.title,
                },
            },
            settings: {
                passingScore: context.testLesson.passingScore,
                allowMultipleAttempts: context.testLesson.allowMultipleAttempts,
                maxAttempts: context.testLesson.maxAttempts,
                timeLimitMinutes: context.testLesson.timeLimitMinutes,
            },
            questions: mappedQuestions,
            attempts,
        };
    }
    async startAttempt(studentId, lessonId) {
        const context = await this.getStudentTestContext(studentId, lessonId);
        await this.finalizeExpiredAttemptsForStudentLesson(studentId, lessonId, context.testLesson.timeLimitMinutes);
        const existingInProgress = await this.prisma.testAttempt.findFirst({
            where: {
                studentId,
                testLessonId: lessonId,
                status: client_1.TestAttemptStatus.IN_PROGRESS,
            },
            orderBy: { startedAt: 'desc' },
        });
        if (existingInProgress) {
            return this.mapAttemptWithExpiresAt(existingInProgress, context.testLesson.timeLimitMinutes);
        }
        const questionsCount = await this.prisma.testQuestion.count({
            where: {
                testLessonId: lessonId,
            },
        });
        if (questionsCount === 0) {
            throw new common_1.BadRequestException('Test has no questions yet');
        }
        const attemptsCount = await this.prisma.testAttempt.count({
            where: {
                studentId,
                testLessonId: lessonId,
            },
        });
        if (!context.testLesson.allowMultipleAttempts && attemptsCount > 0) {
            throw new common_1.BadRequestException('Multiple attempts are not allowed for this test');
        }
        if (context.testLesson.maxAttempts !== null &&
            context.testLesson.maxAttempts !== undefined &&
            attemptsCount >= context.testLesson.maxAttempts) {
            throw new common_1.BadRequestException('Maximum number of attempts reached');
        }
        const attempt = await this.prisma.testAttempt.create({
            data: {
                testLessonId: lessonId,
                studentId,
                enrollmentId: context.enrollment.id,
                attemptNumber: attemptsCount + 1,
                status: client_1.TestAttemptStatus.IN_PROGRESS,
            },
        });
        const now = new Date();
        const existingProgress = await this.prisma.lessonProgress.findUnique({
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
            },
        });
        if (!existingProgress) {
            await this.prisma.lessonProgress.create({
                data: {
                    enrollmentId: context.enrollment.id,
                    studentId,
                    lessonId,
                    status: client_1.LessonProgressStatus.IN_PROGRESS,
                    startedAt: now,
                    lastViewedAt: now,
                },
            });
        }
        else if (existingProgress.status !== client_1.LessonProgressStatus.COMPLETED) {
            await this.prisma.lessonProgress.update({
                where: { id: existingProgress.id },
                data: {
                    status: client_1.LessonProgressStatus.IN_PROGRESS,
                    startedAt: existingProgress.startedAt ?? now,
                    lastViewedAt: now,
                },
            });
        }
        else {
            await this.prisma.lessonProgress.update({
                where: { id: existingProgress.id },
                data: {
                    lastViewedAt: now,
                },
            });
        }
        return this.mapAttemptWithExpiresAt(attempt, context.testLesson.timeLimitMinutes);
    }
    async submitAttempt(studentId, attemptId, dto) {
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { id: attemptId },
            include: {
                testLesson: {
                    include: {
                        questions: {
                            orderBy: { order: 'asc' },
                            include: { options: true },
                        },
                    },
                },
            },
        });
        if (!attempt) {
            throw new common_1.NotFoundException('Test attempt not found');
        }
        if (attempt.studentId !== studentId) {
            throw new common_1.ForbiddenException('You can submit only your own attempts');
        }
        if (attempt.status === client_1.TestAttemptStatus.SUBMITTED) {
            throw new common_1.BadRequestException('This attempt is already submitted');
        }
        if (this.isAttemptExpired(attempt.startedAt, attempt.testLesson.timeLimitMinutes)) {
            return this.finalizeAttempt(attempt, []);
        }
        return this.finalizeAttempt(attempt, dto.answers);
    }
    async listMyAttempts(studentId, lessonId) {
        const context = await this.getStudentTestContext(studentId, lessonId);
        await this.finalizeExpiredAttemptsForStudentLesson(studentId, lessonId, context.testLesson.timeLimitMinutes);
        return this.prisma.testAttempt.findMany({
            where: {
                studentId,
                testLessonId: lessonId,
            },
            orderBy: { attemptNumber: 'desc' },
            include: {
                answers: {
                    include: {
                        selectedOptions: {
                            include: {
                                option: {
                                    select: {
                                        id: true,
                                        text: true,
                                    },
                                },
                            },
                        },
                        question: {
                            select: {
                                id: true,
                                text: true,
                                explanation: true,
                                type: true,
                                points: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async getAttemptResult(studentId, attemptId) {
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { id: attemptId },
            include: {
                testLesson: {
                    include: {
                        lesson: {
                            include: {
                                module: {
                                    include: {
                                        course: {
                                            select: {
                                                id: true,
                                                title: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
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
                answers: {
                    include: {
                        selectedOptions: {
                            include: {
                                option: {
                                    select: {
                                        id: true,
                                        text: true,
                                    },
                                },
                            },
                        },
                        question: {
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
        });
        if (!attempt) {
            throw new common_1.NotFoundException('Attempt not found');
        }
        if (attempt.studentId !== studentId) {
            throw new common_1.ForbiddenException('You can view only your own attempt results');
        }
        if (attempt.status !== client_1.TestAttemptStatus.SUBMITTED) {
            throw new common_1.BadRequestException('Attempt is not submitted yet');
        }
        const answersMap = new Map(attempt.answers.map((answer) => [
            answer.questionId,
            {
                isCorrect: answer.isCorrect,
                pointsAwarded: answer.pointsAwarded,
                selectedOptionIds: answer.selectedOptions.map((item) => item.option.id),
                textAnswer: answer.textAnswer,
                matchingPairs: this.parseSubmittedMatchingPairs(answer.matchingAnswer),
                orderingItemIds: this.parseSubmittedOrderingItemIds(answer.orderingAnswer),
            },
        ]));
        return {
            attempt: {
                id: attempt.id,
                attemptNumber: attempt.attemptNumber,
                status: attempt.status,
                score: attempt.score,
                maxScore: attempt.maxScore,
                scorePercent: attempt.scorePercent,
                isPassed: attempt.isPassed,
                startedAt: attempt.startedAt,
                submittedAt: attempt.submittedAt,
            },
            lesson: {
                id: attempt.testLesson.lesson.id,
                title: attempt.testLesson.lesson.title,
                description: attempt.testLesson.lesson.description,
                moduleTitle: attempt.testLesson.lesson.module.title,
                courseId: attempt.testLesson.lesson.module.course.id,
                courseTitle: attempt.testLesson.lesson.module.course.title,
            },
            questions: attempt.testLesson.questions.map((question) => {
                const answer = answersMap.get(question.id);
                const matchingPairs = this.parseMatchingPairs(question.matchingPairs);
                const orderingItems = this.parseOrderingItems(question.orderingItems);
                const correctOptionIds = question.options
                    .filter((option) => option.isCorrect)
                    .map((option) => option.id);
                return {
                    questionId: question.id,
                    text: question.text,
                    explanation: question.explanation,
                    type: question.type,
                    points: question.points,
                    isCorrect: answer?.isCorrect ?? false,
                    pointsAwarded: answer?.pointsAwarded ?? 0,
                    selectedOptionIds: answer?.selectedOptionIds ?? [],
                    correctOptionIds,
                    selectedTextAnswer: answer?.textAnswer ?? null,
                    acceptedAnswers: question.type === client_1.QuestionType.FREE_TEXT
                        ? this.parseAcceptedAnswers(question.freeTextAcceptedAnswers)
                        : [],
                    selectedMatchingPairs: question.type === client_1.QuestionType.MATCHING
                        ? this.expandMatchingSelection(matchingPairs, answer?.matchingPairs ?? [])
                        : [],
                    correctMatchingPairs: question.type === client_1.QuestionType.MATCHING ? matchingPairs : [],
                    selectedOrderingItemIds: question.type === client_1.QuestionType.ORDERING
                        ? answer?.orderingItemIds ?? []
                        : [],
                    correctOrderingItemIds: question.type === client_1.QuestionType.ORDERING
                        ? orderingItems.map((item) => item.id)
                        : [],
                    orderingItems: question.type === client_1.QuestionType.ORDERING ? orderingItems : [],
                    options: question.options.map((option) => ({
                        id: option.id,
                        text: option.text,
                    })),
                };
            }),
        };
    }
    async listLessonAttemptsForTeacher(teacherId, lessonId) {
        await this.getOwnedTestLessonForTeacher(teacherId, lessonId);
        return this.prisma.testAttempt.findMany({
            where: {
                testLessonId: lessonId,
            },
            orderBy: [{ attemptNumber: 'desc' }, { submittedAt: 'desc' }],
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
        });
    }
    async finalizeExpiredAttemptsForStudentLesson(studentId, lessonId, timeLimitMinutes) {
        if (!timeLimitMinutes || timeLimitMinutes <= 0) {
            return;
        }
        const inProgressAttempts = await this.prisma.testAttempt.findMany({
            where: {
                studentId,
                testLessonId: lessonId,
                status: client_1.TestAttemptStatus.IN_PROGRESS,
            },
            orderBy: { startedAt: 'asc' },
            include: {
                testLesson: {
                    include: {
                        questions: {
                            orderBy: { order: 'asc' },
                            include: {
                                options: true,
                            },
                        },
                    },
                },
            },
        });
        for (const attempt of inProgressAttempts) {
            if (!this.isAttemptExpired(attempt.startedAt, attempt.testLesson.timeLimitMinutes)) {
                continue;
            }
            try {
                await this.finalizeAttempt(attempt, []);
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    continue;
                }
                throw error;
            }
        }
    }
    async finalizeAttempt(attempt, answers) {
        const scoreResult = this.calculateScore(attempt.testLesson.questions, answers);
        const completedAt = new Date();
        return this.prisma.$transaction(async (tx) => {
            await tx.testAttemptAnswer.deleteMany({
                where: { attemptId: attempt.id },
            });
            for (const answerResult of scoreResult.answerResults) {
                const createdAnswer = await tx.testAttemptAnswer.create({
                    data: {
                        attemptId: attempt.id,
                        questionId: answerResult.questionId,
                        isCorrect: answerResult.isCorrect,
                        pointsAwarded: answerResult.pointsAwarded,
                        textAnswer: answerResult.textAnswer,
                        matchingAnswer: answerResult.matchingPairs,
                        orderingAnswer: answerResult.orderingItemIds,
                    },
                });
                if (answerResult.optionIds.length > 0) {
                    await tx.testAttemptAnswerOption.createMany({
                        data: answerResult.optionIds.map((optionId) => ({
                            attemptAnswerId: createdAnswer.id,
                            optionId,
                        })),
                    });
                }
            }
            const attemptUpdateResult = await tx.testAttempt.updateMany({
                where: {
                    id: attempt.id,
                    status: client_1.TestAttemptStatus.IN_PROGRESS,
                },
                data: {
                    status: client_1.TestAttemptStatus.SUBMITTED,
                    submittedAt: completedAt,
                    score: scoreResult.score,
                    maxScore: scoreResult.maxScore,
                    scorePercent: scoreResult.scorePercent,
                    isPassed: attempt.testLesson.passingScore === null ||
                        scoreResult.score >= attempt.testLesson.passingScore,
                },
            });
            if (attemptUpdateResult.count === 0) {
                throw new common_1.BadRequestException('This attempt is already submitted');
            }
            const existingProgress = await tx.lessonProgress.findUnique({
                where: {
                    studentId_lessonId: {
                        studentId: attempt.studentId,
                        lessonId: attempt.testLessonId,
                    },
                },
            });
            const hasBetterScore = existingProgress?.bestTestScore === null ||
                existingProgress?.bestTestScore === undefined ||
                scoreResult.score > existingProgress.bestTestScore;
            await tx.lessonProgress.upsert({
                where: {
                    studentId_lessonId: {
                        studentId: attempt.studentId,
                        lessonId: attempt.testLessonId,
                    },
                },
                create: {
                    enrollmentId: attempt.enrollmentId,
                    studentId: attempt.studentId,
                    lessonId: attempt.testLessonId,
                    status: client_1.LessonProgressStatus.COMPLETED,
                    startedAt: attempt.startedAt,
                    lastViewedAt: completedAt,
                    completedAt,
                    attemptsCount: 1,
                    bestTestScore: scoreResult.score,
                    bestTestMaxScore: scoreResult.maxScore,
                },
                update: {
                    status: client_1.LessonProgressStatus.COMPLETED,
                    lastViewedAt: completedAt,
                    completedAt,
                    attemptsCount: { increment: 1 },
                    bestTestScore: hasBetterScore
                        ? scoreResult.score
                        : existingProgress?.bestTestScore,
                    bestTestMaxScore: hasBetterScore
                        ? scoreResult.maxScore
                        : existingProgress?.bestTestMaxScore,
                },
            });
            const updatedAttempt = await tx.testAttempt.findUnique({
                where: { id: attempt.id },
                include: {
                    answers: {
                        include: {
                            selectedOptions: true,
                        },
                    },
                },
            });
            if (!updatedAttempt) {
                throw new common_1.NotFoundException('Test attempt not found');
            }
            const result = this.buildResultPayload(attempt.testLesson.questions, scoreResult.answerResults);
            return {
                attempt: updatedAttempt,
                result: {
                    score: scoreResult.score,
                    maxScore: scoreResult.maxScore,
                    scorePercent: scoreResult.scorePercent,
                    isPassed: attempt.testLesson.passingScore === null ||
                        scoreResult.score >= attempt.testLesson.passingScore,
                    questions: result,
                },
            };
        });
    }
    mapAttemptWithExpiresAt(attempt, timeLimitMinutes) {
        return {
            ...attempt,
            expiresAt: this.resolveAttemptExpiresAt(attempt.startedAt, timeLimitMinutes),
        };
    }
    isAttemptExpired(startedAt, timeLimitMinutes, now = new Date()) {
        const expiresAt = this.resolveAttemptExpiresAt(startedAt, timeLimitMinutes);
        if (!expiresAt) {
            return false;
        }
        return expiresAt.getTime() <= now.getTime();
    }
    resolveAttemptExpiresAt(startedAt, timeLimitMinutes) {
        if (!timeLimitMinutes || timeLimitMinutes <= 0) {
            return null;
        }
        return new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
    }
    async getStudentTestContext(studentId, lessonId) {
        const testLesson = await this.prisma.testLesson.findUnique({
            where: { lessonId },
            include: {
                lesson: {
                    include: {
                        module: {
                            include: {
                                course: {
                                    select: {
                                        id: true,
                                        title: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!testLesson) {
            throw new common_1.NotFoundException('Test lesson not found');
        }
        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                courseId_studentId: {
                    courseId: testLesson.lesson.module.course.id,
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
        if (!testLesson.lesson.isPublished) {
            throw new common_1.ForbiddenException('Test lesson is not published');
        }
        return { testLesson, enrollment };
    }
    calculateScore(questions, answers) {
        const answersMap = new Map();
        for (const item of answers) {
            if (answersMap.has(item.questionId)) {
                throw new common_1.BadRequestException(`Duplicate answer for question ${item.questionId}`);
            }
            answersMap.set(item.questionId, item);
        }
        const answerResults = questions.map((question) => {
            const submitted = answersMap.get(question.id);
            if (question.type === client_1.QuestionType.SINGLE_CHOICE ||
                question.type === client_1.QuestionType.MULTIPLE_CHOICE) {
                const selectedOptionIds = Array.from(new Set(submitted?.optionIds ?? [])).filter((id) => question.options.some((option) => option.id === id));
                const correctOptionIds = question.options
                    .filter((option) => option.isCorrect)
                    .map((option) => option.id)
                    .sort();
                const submittedSorted = [...selectedOptionIds].sort();
                const isCorrect = submittedSorted.length === correctOptionIds.length &&
                    submittedSorted.every((optionId, index) => optionId === correctOptionIds[index]);
                return {
                    questionId: question.id,
                    optionIds: selectedOptionIds,
                    textAnswer: null,
                    matchingPairs: [],
                    orderingItemIds: [],
                    isCorrect,
                    pointsAwarded: isCorrect ? question.points : 0,
                };
            }
            if (question.type === client_1.QuestionType.FREE_TEXT) {
                const acceptedAnswers = this.parseAcceptedAnswers(question.freeTextAcceptedAnswers);
                const normalizedAcceptedAnswers = new Set(acceptedAnswers.map((item) => this.normalizeComparableText(item)));
                const textAnswer = submitted?.textAnswer?.trim() ?? '';
                const normalizedSubmitted = this.normalizeComparableText(textAnswer);
                const isCorrect = normalizedSubmitted.length > 0 &&
                    normalizedAcceptedAnswers.has(normalizedSubmitted);
                return {
                    questionId: question.id,
                    optionIds: [],
                    textAnswer,
                    matchingPairs: [],
                    orderingItemIds: [],
                    isCorrect,
                    pointsAwarded: isCorrect ? question.points : 0,
                };
            }
            if (question.type === client_1.QuestionType.MATCHING) {
                const matchingPairs = this.parseMatchingPairs(question.matchingPairs);
                const normalizedSubmittedPairs = this.normalizeSubmittedMatchingPairs(submitted?.matchingPairs ?? [], matchingPairs);
                const submittedMap = new Map(normalizedSubmittedPairs.map((pair) => [pair.leftId, pair.rightId]));
                const isCorrect = submittedMap.size === matchingPairs.length &&
                    matchingPairs.every((pair) => submittedMap.get(pair.leftId) === pair.rightId);
                return {
                    questionId: question.id,
                    optionIds: [],
                    textAnswer: null,
                    matchingPairs: normalizedSubmittedPairs,
                    orderingItemIds: [],
                    isCorrect,
                    pointsAwarded: isCorrect ? question.points : 0,
                };
            }
            const orderingItems = this.parseOrderingItems(question.orderingItems);
            const normalizedOrderingItemIds = this.normalizeSubmittedOrderingItemIds(submitted?.orderingItemIds ?? [], orderingItems);
            const expectedOrderIds = orderingItems.map((item) => item.id);
            const isCorrect = normalizedOrderingItemIds.length === expectedOrderIds.length &&
                normalizedOrderingItemIds.every((itemId, index) => itemId === expectedOrderIds[index]);
            return {
                questionId: question.id,
                optionIds: [],
                textAnswer: null,
                matchingPairs: [],
                orderingItemIds: normalizedOrderingItemIds,
                isCorrect,
                pointsAwarded: isCorrect ? question.points : 0,
            };
        });
        const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
        const score = answerResults.reduce((sum, answer) => sum + answer.pointsAwarded, 0);
        const scorePercent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
        return {
            maxScore,
            score,
            scorePercent,
            answerResults,
        };
    }
    validateTestContent(dto) {
        for (let i = 0; i < dto.questions.length; i += 1) {
            const question = dto.questions[i];
            if (question.type === client_1.QuestionType.SINGLE_CHOICE ||
                question.type === client_1.QuestionType.MULTIPLE_CHOICE) {
                const options = question.options ?? [];
                if (options.length < 2) {
                    throw new common_1.BadRequestException(`Question ${i + 1} must have at least two options`);
                }
                const hasEmptyOption = options.some((option) => option.text.trim().length === 0);
                if (hasEmptyOption) {
                    throw new common_1.BadRequestException(`Question ${i + 1} has empty option text`);
                }
                const correctCount = options.filter((option) => option.isCorrect).length;
                if (correctCount === 0) {
                    throw new common_1.BadRequestException(`Question ${i + 1} must have at least one correct option`);
                }
                if (question.type === client_1.QuestionType.SINGLE_CHOICE && correctCount !== 1) {
                    throw new common_1.BadRequestException(`Question ${i + 1} must have exactly one correct option`);
                }
                if (question.type === client_1.QuestionType.MULTIPLE_CHOICE && correctCount < 2) {
                    throw new common_1.BadRequestException(`Question ${i + 1} must have at least two correct options`);
                }
                continue;
            }
            if (question.type === client_1.QuestionType.FREE_TEXT) {
                const acceptedAnswers = (question.acceptedAnswers ?? [])
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0);
                if (acceptedAnswers.length === 0) {
                    throw new common_1.BadRequestException(`Question ${i + 1} must have at least one accepted answer`);
                }
                const normalized = acceptedAnswers.map((item) => this.normalizeComparableText(item));
                const hasDuplicates = new Set(normalized).size !== normalized.length;
                if (hasDuplicates) {
                    throw new common_1.BadRequestException(`Question ${i + 1} has duplicated accepted answers`);
                }
                continue;
            }
            if (question.type === client_1.QuestionType.MATCHING) {
                const pairs = question.matchingPairs ?? [];
                if (pairs.length < 2) {
                    throw new common_1.BadRequestException(`Question ${i + 1} must have at least two matching pairs`);
                }
                const normalizedLeft = pairs.map((pair) => this.normalizeComparableText(pair.left));
                const normalizedRight = pairs.map((pair) => this.normalizeComparableText(pair.right));
                if (normalizedLeft.some((item) => item.length === 0) ||
                    normalizedRight.some((item) => item.length === 0)) {
                    throw new common_1.BadRequestException(`Question ${i + 1} has empty matching pair values`);
                }
                if (new Set(normalizedLeft).size !== normalizedLeft.length) {
                    throw new common_1.BadRequestException(`Question ${i + 1} has duplicated left matching values`);
                }
                if (new Set(normalizedRight).size !== normalizedRight.length) {
                    throw new common_1.BadRequestException(`Question ${i + 1} has duplicated right matching values`);
                }
                continue;
            }
            if (question.type === client_1.QuestionType.ORDERING) {
                const orderingItems = question.orderingItems ?? [];
                if (orderingItems.length < 2) {
                    throw new common_1.BadRequestException(`Question ${i + 1} must have at least two ordering items`);
                }
                const normalizedItems = orderingItems.map((item) => this.normalizeComparableText(item.text));
                if (normalizedItems.some((item) => item.length === 0)) {
                    throw new common_1.BadRequestException(`Question ${i + 1} has empty ordering item`);
                }
                if (new Set(normalizedItems).size !== normalizedItems.length) {
                    throw new common_1.BadRequestException(`Question ${i + 1} has duplicated ordering items`);
                }
            }
        }
    }
    buildResultPayload(questions, answerResults) {
        const answerMap = new Map(answerResults.map((answer) => [answer.questionId, answer]));
        return questions.map((question) => {
            const answer = answerMap.get(question.id);
            const matchingPairs = this.parseMatchingPairs(question.matchingPairs);
            const orderingItems = this.parseOrderingItems(question.orderingItems);
            const correctOptionIds = question.options
                .filter((option) => option.isCorrect)
                .map((option) => option.id);
            return {
                questionId: question.id,
                text: question.text,
                explanation: question.explanation,
                type: question.type,
                points: question.points,
                pointsAwarded: answer?.pointsAwarded ?? 0,
                isCorrect: answer?.isCorrect ?? false,
                selectedOptionIds: answer?.optionIds ?? [],
                correctOptionIds,
                selectedTextAnswer: answer?.textAnswer ?? null,
                acceptedAnswers: question.type === client_1.QuestionType.FREE_TEXT
                    ? this.parseAcceptedAnswers(question.freeTextAcceptedAnswers)
                    : [],
                selectedMatchingPairs: question.type === client_1.QuestionType.MATCHING
                    ? this.expandMatchingSelection(matchingPairs, answer?.matchingPairs ?? [])
                    : [],
                correctMatchingPairs: question.type === client_1.QuestionType.MATCHING ? matchingPairs : [],
                selectedOrderingItemIds: question.type === client_1.QuestionType.ORDERING
                    ? answer?.orderingItemIds ?? []
                    : [],
                correctOrderingItemIds: question.type === client_1.QuestionType.ORDERING
                    ? orderingItems.map((item) => item.id)
                    : [],
                orderingItems: question.type === client_1.QuestionType.ORDERING ? orderingItems : [],
                options: question.options.map((option) => ({
                    id: option.id,
                    text: option.text,
                    isCorrect: option.isCorrect,
                })),
            };
        });
    }
    mapTeacherTestContent(testLesson) {
        return {
            lessonId: testLesson.lessonId,
            passingScore: testLesson.passingScore,
            allowMultipleAttempts: testLesson.allowMultipleAttempts,
            maxAttempts: testLesson.maxAttempts,
            timeLimitMinutes: testLesson.timeLimitMinutes,
            lesson: testLesson.lesson,
            questions: testLesson.questions.map((question) => ({
                id: question.id,
                text: question.text,
                explanation: question.explanation,
                type: question.type,
                order: question.order,
                points: question.points,
                options: question.options.map((option) => ({
                    id: option.id,
                    text: option.text,
                    isCorrect: option.isCorrect,
                    order: option.order,
                })),
                acceptedAnswers: question.type === client_1.QuestionType.FREE_TEXT
                    ? this.parseAcceptedAnswers(question.freeTextAcceptedAnswers)
                    : [],
                matchingPairs: question.type === client_1.QuestionType.MATCHING
                    ? this.parseMatchingPairs(question.matchingPairs)
                    : [],
                orderingItems: question.type === client_1.QuestionType.ORDERING
                    ? this.parseOrderingItems(question.orderingItems)
                    : [],
            })),
        };
    }
    prepareQuestionContentForPersistence(question) {
        const options = (question.options ?? []).map((option) => ({
            text: option.text.trim(),
            isCorrect: option.isCorrect,
        }));
        const acceptedAnswers = question.type === client_1.QuestionType.FREE_TEXT
            ? this.uniqueNormalizedStrings(question.acceptedAnswers ?? [])
            : null;
        const matchingPairs = question.type === client_1.QuestionType.MATCHING
            ? (question.matchingPairs ?? []).map((pair) => ({
                leftId: pair.leftId ?? (0, crypto_1.randomUUID)(),
                left: pair.left.trim(),
                rightId: pair.rightId ?? (0, crypto_1.randomUUID)(),
                right: pair.right.trim(),
            }))
            : null;
        const orderingItems = question.type === client_1.QuestionType.ORDERING
            ? (question.orderingItems ?? []).map((item) => ({
                id: item.id ?? (0, crypto_1.randomUUID)(),
                text: item.text.trim(),
            }))
            : null;
        return {
            options: question.type === client_1.QuestionType.SINGLE_CHOICE ||
                question.type === client_1.QuestionType.MULTIPLE_CHOICE
                ? options
                : [],
            acceptedAnswers,
            matchingPairs,
            orderingItems,
        };
    }
    parseAcceptedAnswers(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .filter((item) => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }
    parseMatchingPairs(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .map((item) => {
            if (typeof item !== 'object' || item === null)
                return null;
            const record = item;
            const left = typeof record.left === 'string' ? record.left.trim() : '';
            const right = typeof record.right === 'string' ? record.right.trim() : '';
            const leftId = typeof record.leftId === 'string' && this.isUuid(record.leftId)
                ? record.leftId
                : null;
            const rightId = typeof record.rightId === 'string' && this.isUuid(record.rightId)
                ? record.rightId
                : null;
            if (!left || !right || !leftId || !rightId) {
                return null;
            }
            return {
                leftId,
                left,
                rightId,
                right,
            };
        })
            .filter((item) => Boolean(item));
    }
    parseOrderingItems(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .map((item) => {
            if (typeof item !== 'object' || item === null)
                return null;
            const record = item;
            const text = typeof record.text === 'string' ? record.text.trim() : '';
            const id = typeof record.id === 'string' && this.isUuid(record.id)
                ? record.id
                : null;
            if (!id || !text) {
                return null;
            }
            return {
                id,
                text,
            };
        })
            .filter((item) => Boolean(item));
    }
    parseSubmittedMatchingPairs(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .map((item) => {
            if (typeof item !== 'object' || item === null)
                return null;
            const record = item;
            const leftId = typeof record.leftId === 'string' && this.isUuid(record.leftId)
                ? record.leftId
                : null;
            const rightId = typeof record.rightId === 'string' && this.isUuid(record.rightId)
                ? record.rightId
                : null;
            if (!leftId || !rightId)
                return null;
            return { leftId, rightId };
        })
            .filter((item) => Boolean(item));
    }
    parseSubmittedOrderingItemIds(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.filter((item) => typeof item === 'string');
    }
    normalizeSubmittedMatchingPairs(submittedPairs, matchingPairs) {
        const validLeftIds = new Set(matchingPairs.map((pair) => pair.leftId));
        const validRightIds = new Set(matchingPairs.map((pair) => pair.rightId));
        const seenLeftIds = new Set();
        const normalizedPairs = [];
        for (const pair of submittedPairs) {
            if (!validLeftIds.has(pair.leftId) || !validRightIds.has(pair.rightId)) {
                continue;
            }
            if (seenLeftIds.has(pair.leftId)) {
                continue;
            }
            seenLeftIds.add(pair.leftId);
            normalizedPairs.push(pair);
        }
        return normalizedPairs;
    }
    normalizeSubmittedOrderingItemIds(submittedIds, orderingItems) {
        const validIds = new Set(orderingItems.map((item) => item.id));
        const seenIds = new Set();
        const normalizedIds = [];
        for (const id of submittedIds) {
            if (!validIds.has(id) || seenIds.has(id)) {
                continue;
            }
            seenIds.add(id);
            normalizedIds.push(id);
        }
        return normalizedIds;
    }
    expandMatchingSelection(matchingPairs, selectedPairs) {
        const selectedMap = new Map(selectedPairs.map((pair) => [pair.leftId, pair.rightId]));
        const rightById = new Map(matchingPairs.map((pair) => [pair.rightId, pair.right]));
        return matchingPairs.map((pair) => {
            const selectedRightId = selectedMap.get(pair.leftId) ?? null;
            return {
                leftId: pair.leftId,
                left: pair.left,
                correctRightId: pair.rightId,
                correctRight: pair.right,
                selectedRightId,
                selectedRight: selectedRightId && rightById.has(selectedRightId)
                    ? rightById.get(selectedRightId)
                    : null,
            };
        });
    }
    normalizeComparableText(value) {
        return value.trim().replace(/\s+/g, ' ').toLowerCase();
    }
    uniqueNormalizedStrings(values) {
        const result = [];
        const seen = new Set();
        for (const value of values) {
            const trimmed = value.trim();
            if (!trimmed)
                continue;
            const normalized = this.normalizeComparableText(trimmed);
            if (seen.has(normalized))
                continue;
            seen.add(normalized);
            result.push(trimmed);
        }
        return result;
    }
    shuffleArray(items) {
        const result = [...items];
        for (let i = result.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
    isUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }
    async getOwnedTestLessonForTeacher(teacherId, lessonId) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                module: {
                    include: {
                        course: {
                            select: {
                                teacherId: true,
                            },
                        },
                    },
                },
            },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        if (lesson.type !== client_1.LessonType.TEST) {
            throw new common_1.BadRequestException('Lesson is not a test lesson');
        }
        if (lesson.module.course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can manage tests only in your own courses');
        }
        return lesson;
    }
};
exports.TestsService = TestsService;
exports.TestsService = TestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TestsService);
//# sourceMappingURL=tests.service.js.map