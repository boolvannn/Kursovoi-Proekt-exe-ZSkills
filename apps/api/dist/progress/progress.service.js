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
exports.ProgressService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let ProgressService = class ProgressService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listMyCourseProgress(studentId, courseId) {
        return this.prisma.lessonProgress.findMany({
            where: {
                studentId,
                enrollment: {
                    courseId,
                    status: client_1.EnrollmentStatus.ACTIVE,
                },
            },
            include: {
                lesson: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        orderIndex: true,
                        module: {
                            select: {
                                id: true,
                                title: true,
                                orderIndex: true,
                            },
                        },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async getMyCourseProgressOverview(studentId, courseId) {
        const snapshot = await this.buildStudentProgressSnapshot(courseId, studentId);
        return {
            course: snapshot.course,
            student: {
                id: snapshot.student.id,
            },
            summary: snapshot.summary,
            tests: snapshot.tests,
            modules: snapshot.modules,
            lastActivityAt: snapshot.lastActivityAt,
        };
    }
    async markStarted(studentId, lessonId) {
        const context = await this.resolveContext(studentId, lessonId);
        const now = new Date();
        const existing = await this.prisma.lessonProgress.findUnique({
            where: { studentId_lessonId: { studentId, lessonId } },
        });
        if (existing) {
            return this.prisma.lessonProgress.update({
                where: { id: existing.id },
                data: {
                    status: existing.status === client_1.LessonProgressStatus.COMPLETED
                        ? client_1.LessonProgressStatus.COMPLETED
                        : client_1.LessonProgressStatus.IN_PROGRESS,
                    startedAt: existing.startedAt ?? now,
                    lastViewedAt: now,
                },
            });
        }
        return this.prisma.lessonProgress.create({
            data: {
                enrollmentId: context.enrollmentId,
                studentId,
                lessonId,
                status: client_1.LessonProgressStatus.IN_PROGRESS,
                startedAt: now,
                lastViewedAt: now,
            },
        });
    }
    async markCompleted(studentId, lessonId) {
        const context = await this.resolveContext(studentId, lessonId);
        const now = new Date();
        if (context.lessonType === client_1.LessonType.TEST) {
            throw new common_1.BadRequestException('Test lessons are completed automatically after test submission');
        }
        return this.prisma.lessonProgress.upsert({
            where: { studentId_lessonId: { studentId, lessonId } },
            create: {
                enrollmentId: context.enrollmentId,
                studentId,
                lessonId,
                status: client_1.LessonProgressStatus.COMPLETED,
                startedAt: now,
                lastViewedAt: now,
                completedAt: now,
            },
            update: {
                status: client_1.LessonProgressStatus.COMPLETED,
                lastViewedAt: now,
                completedAt: now,
            },
        });
    }
    async getTeacherCourseProgressOverview(teacherId, courseId) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        const [course, modules] = await Promise.all([
            this.prisma.course.findUnique({
                where: { id: courseId },
                select: { id: true, title: true },
            }),
            this.getPublishedModulesWithLessons(courseId),
        ]);
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
        const totalLessons = lessonIds.length;
        const enrollments = await this.prisma.enrollment.findMany({
            where: {
                courseId,
                status: client_1.EnrollmentStatus.ACTIVE,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        group: true,
                    },
                },
                lessonProgress: lessonIds.length > 0
                    ? {
                        where: {
                            lessonId: { in: lessonIds },
                        },
                        select: {
                            lessonId: true,
                            status: true,
                            startedAt: true,
                            lastViewedAt: true,
                            completedAt: true,
                            bestTestScore: true,
                            bestTestMaxScore: true,
                            attemptsCount: true,
                            updatedAt: true,
                        },
                    }
                    : {
                        select: {
                            lessonId: true,
                            status: true,
                            startedAt: true,
                            lastViewedAt: true,
                            completedAt: true,
                            bestTestScore: true,
                            bestTestMaxScore: true,
                            attemptsCount: true,
                            updatedAt: true,
                        },
                    },
                testAttempts: {
                    where: {
                        status: client_1.TestAttemptStatus.SUBMITTED,
                    },
                    select: {
                        testLessonId: true,
                        score: true,
                        maxScore: true,
                        scorePercent: true,
                        submittedAt: true,
                    },
                },
            },
            orderBy: {
                enrolledAt: 'asc',
            },
        });
        const students = enrollments
            .map((enrollment) => {
            const stats = this.calculateStudentProgressStats(modules, enrollment.lessonProgress, enrollment.testAttempts);
            return {
                enrollmentId: enrollment.id,
                student: enrollment.student,
                progress: {
                    totalLessons,
                    completedLessons: stats.completedLessons,
                    inProgressLessons: stats.inProgressLessons,
                    notStartedLessons: stats.notStartedLessons,
                    completionRatePercent: stats.completionRatePercent,
                    status: stats.status,
                    lastActivityAt: stats.lastActivityAt,
                },
                tests: {
                    submittedAttempts: stats.submittedAttempts,
                    averageScorePercent: stats.averageTestScorePercent,
                    bestScorePercent: stats.bestTestScorePercent,
                },
            };
        })
            .sort((a, b) => {
            if (a.progress.completionRatePercent !== b.progress.completionRatePercent) {
                return a.progress.completionRatePercent - b.progress.completionRatePercent;
            }
            return a.student.fullName.localeCompare(b.student.fullName);
        });
        const lessonTypeTotals = this.countLessonTypes(modules);
        const completedLessonProgress = students.reduce((sum, row) => sum + row.progress.completedLessons, 0);
        const inProgressLessonProgress = students.reduce((sum, row) => sum + row.progress.inProgressLessons, 0);
        const notStartedLessonProgress = students.reduce((sum, row) => sum + row.progress.notStartedLessons, 0);
        const totalStudents = students.length;
        const totalPossibleProgress = totalStudents * totalLessons;
        const completionRatePercent = totalPossibleProgress === 0
            ? 0
            : Number(((completedLessonProgress / totalPossibleProgress) * 100).toFixed(2));
        const averageStudentCompletionPercent = students.length === 0
            ? 0
            : Number((students.reduce((sum, row) => sum + row.progress.completionRatePercent, 0) / students.length).toFixed(2));
        const studentsCompletedCourse = students.filter((row) => row.progress.status === client_1.LessonProgressStatus.COMPLETED).length;
        const studentsAtRisk = students.filter((row) => row.progress.totalLessons > 0 && row.progress.completionRatePercent < 40).length;
        const submittedTestAttempts = students.reduce((sum, row) => sum + row.tests.submittedAttempts, 0);
        const averageBestTestScorePercent = this.averageNullable(students.map((row) => row.tests.bestScorePercent));
        return {
            course: {
                id: course.id,
                title: course.title,
            },
            summary: {
                students: totalStudents,
                lessons: {
                    total: totalLessons,
                    lecture: lessonTypeTotals.lecture,
                    webinar: lessonTypeTotals.webinar,
                    test: lessonTypeTotals.test,
                },
                completedLessonProgress,
                inProgressLessonProgress,
                notStartedLessonProgress,
                totalPossibleProgress,
                completionRatePercent,
                averageStudentCompletionPercent,
                studentsCompletedCourse,
                studentsAtRisk,
            },
            tests: {
                submittedAttempts: submittedTestAttempts,
                averageBestScorePercent: averageBestTestScorePercent,
            },
            students,
        };
    }
    async getTeacherStudentProgressByCourse(teacherId, courseId, studentId) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        const snapshot = await this.buildStudentProgressSnapshot(courseId, studentId);
        return {
            course: snapshot.course,
            student: snapshot.student,
            enrollment: snapshot.enrollment,
            summary: snapshot.summary,
            tests: snapshot.tests,
            modules: snapshot.modules,
            lastActivityAt: snapshot.lastActivityAt,
        };
    }
    async buildStudentProgressSnapshot(courseId, studentId) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId,
                },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        group: true,
                    },
                },
            },
        });
        if (!enrollment || enrollment.status !== client_1.EnrollmentStatus.ACTIVE) {
            throw new common_1.NotFoundException('Active enrollment not found for this student');
        }
        const [course, modules] = await Promise.all([
            this.prisma.course.findUnique({
                where: { id: courseId },
                select: { id: true, title: true },
            }),
            this.getPublishedModulesWithLessons(courseId),
        ]);
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
        const [progressRows, submittedAttempts] = await this.prisma.$transaction([
            lessonIds.length > 0
                ? this.prisma.lessonProgress.findMany({
                    where: {
                        studentId,
                        lessonId: {
                            in: lessonIds,
                        },
                        enrollment: {
                            courseId,
                            status: client_1.EnrollmentStatus.ACTIVE,
                        },
                    },
                    select: {
                        lessonId: true,
                        status: true,
                        startedAt: true,
                        lastViewedAt: true,
                        completedAt: true,
                        bestTestScore: true,
                        bestTestMaxScore: true,
                        attemptsCount: true,
                        updatedAt: true,
                    },
                })
                : this.prisma.lessonProgress.findMany({
                    where: {
                        studentId,
                        enrollment: {
                            courseId,
                            status: client_1.EnrollmentStatus.ACTIVE,
                        },
                        lessonId: '__never__',
                    },
                    select: {
                        lessonId: true,
                        status: true,
                        startedAt: true,
                        lastViewedAt: true,
                        completedAt: true,
                        bestTestScore: true,
                        bestTestMaxScore: true,
                        attemptsCount: true,
                        updatedAt: true,
                    },
                }),
            this.prisma.testAttempt.findMany({
                where: {
                    studentId,
                    status: client_1.TestAttemptStatus.SUBMITTED,
                    enrollment: {
                        courseId,
                        status: client_1.EnrollmentStatus.ACTIVE,
                    },
                },
                select: {
                    testLessonId: true,
                    score: true,
                    maxScore: true,
                    scorePercent: true,
                    submittedAt: true,
                },
            }),
        ]);
        const progressMap = new Map(progressRows.map((row) => [row.lessonId, row]));
        const testMetricsByLesson = this.mapTestMetricsByLesson(submittedAttempts);
        const totalLessons = lessonIds.length;
        let completedLessons = 0;
        let inProgressLessons = 0;
        let notStartedLessons = 0;
        const modulesPayload = modules.map((module) => {
            let moduleCompleted = 0;
            let moduleInProgress = 0;
            let moduleNotStarted = 0;
            const lessonsPayload = module.lessons.map((lesson) => {
                const progress = progressMap.get(lesson.id);
                const testMetrics = testMetricsByLesson.get(lesson.id);
                const status = this.resolveLessonStatus(lesson.type, progress?.status ?? null, testMetrics?.attemptsCount ?? 0);
                if (status === client_1.LessonProgressStatus.COMPLETED) {
                    completedLessons += 1;
                    moduleCompleted += 1;
                }
                else if (status === client_1.LessonProgressStatus.IN_PROGRESS) {
                    inProgressLessons += 1;
                    moduleInProgress += 1;
                }
                else {
                    notStartedLessons += 1;
                    moduleNotStarted += 1;
                }
                return {
                    id: lesson.id,
                    title: lesson.title,
                    type: lesson.type,
                    orderIndex: lesson.orderIndex,
                    status,
                    startedAt: progress?.startedAt ?? null,
                    lastViewedAt: progress?.lastViewedAt ?? testMetrics?.latestSubmittedAt ?? null,
                    completedAt: progress?.completedAt ?? testMetrics?.latestSubmittedAt ?? null,
                    tests: lesson.type === client_1.LessonType.TEST
                        ? {
                            attemptsCount: testMetrics?.attemptsCount ?? progress?.attemptsCount ?? 0,
                            bestScore: testMetrics?.bestScore ?? progress?.bestTestScore ?? null,
                            bestMaxScore: testMetrics?.bestMaxScore ?? progress?.bestTestMaxScore ?? null,
                            bestScorePercent: testMetrics?.bestScorePercent ?? null,
                        }
                        : null,
                };
            });
            const moduleCompletionRatePercent = module.lessons.length === 0
                ? 0
                : Number(((moduleCompleted / module.lessons.length) * 100).toFixed(2));
            return {
                id: module.id,
                title: module.title,
                description: module.description,
                orderIndex: module.orderIndex,
                progress: {
                    completedLessons: moduleCompleted,
                    inProgressLessons: moduleInProgress,
                    notStartedLessons: moduleNotStarted,
                    totalLessons: module.lessons.length,
                    completionRatePercent: moduleCompletionRatePercent,
                    status: this.resolveAggregateStatus(moduleCompleted, moduleInProgress, module.lessons.length),
                },
                lessons: lessonsPayload,
            };
        });
        const completionRatePercent = totalLessons === 0
            ? 0
            : Number(((completedLessons / totalLessons) * 100).toFixed(2));
        const testsAverageScorePercent = this.averageNullable(submittedAttempts.map((attempt) => attempt.scorePercent));
        const testsBestScorePercent = this.maxNullable(submittedAttempts.map((attempt) => attempt.scorePercent));
        return {
            course,
            student: enrollment.student,
            enrollment: {
                id: enrollment.id,
                enrolledAt: enrollment.enrolledAt,
            },
            summary: {
                completedLessons,
                inProgressLessons,
                notStartedLessons,
                totalLessons,
                completionRatePercent,
                status: this.resolveAggregateStatus(completedLessons, inProgressLessons, totalLessons),
            },
            tests: {
                submittedAttempts: submittedAttempts.length,
                averageScorePercent: testsAverageScorePercent,
                bestScorePercent: testsBestScorePercent,
            },
            modules: modulesPayload,
            lastActivityAt: this.resolveLastActivityAt(progressRows, submittedAttempts),
        };
    }
    calculateStudentProgressStats(modules, lessonProgress, submittedAttempts) {
        const progressMap = new Map(lessonProgress.map((row) => [row.lessonId, row]));
        const testMetricsByLesson = this.mapTestMetricsByLesson(submittedAttempts);
        let completedLessons = 0;
        let inProgressLessons = 0;
        let notStartedLessons = 0;
        const allLessons = modules.flatMap((module) => module.lessons);
        const totalLessons = allLessons.length;
        for (const lesson of allLessons) {
            const progress = progressMap.get(lesson.id);
            const testMetrics = testMetricsByLesson.get(lesson.id);
            const status = this.resolveLessonStatus(lesson.type, progress?.status ?? null, testMetrics?.attemptsCount ?? 0);
            if (status === client_1.LessonProgressStatus.COMPLETED) {
                completedLessons += 1;
            }
            else if (status === client_1.LessonProgressStatus.IN_PROGRESS) {
                inProgressLessons += 1;
            }
            else {
                notStartedLessons += 1;
            }
        }
        const completionRatePercent = totalLessons === 0
            ? 0
            : Number(((completedLessons / totalLessons) * 100).toFixed(2));
        const bestTestScorePercent = this.maxNullable(submittedAttempts.map((attempt) => attempt.scorePercent));
        const averageTestScorePercent = this.averageNullable(submittedAttempts.map((attempt) => attempt.scorePercent));
        return {
            completedLessons,
            inProgressLessons,
            notStartedLessons,
            completionRatePercent,
            status: this.resolveAggregateStatus(completedLessons, inProgressLessons, totalLessons),
            submittedAttempts: submittedAttempts.length,
            bestTestScorePercent,
            averageTestScorePercent,
            lastActivityAt: this.resolveLastActivityAt(lessonProgress, submittedAttempts),
        };
    }
    mapTestMetricsByLesson(attempts) {
        const map = new Map();
        for (const attempt of attempts) {
            const existing = map.get(attempt.testLessonId) ?? {
                attemptsCount: 0,
                bestScore: null,
                bestMaxScore: null,
                bestScorePercent: null,
                latestSubmittedAt: null,
            };
            existing.attemptsCount += 1;
            if (attempt.scorePercent !== null &&
                (existing.bestScorePercent === null ||
                    attempt.scorePercent > existing.bestScorePercent)) {
                existing.bestScorePercent = attempt.scorePercent;
                existing.bestScore = attempt.score;
                existing.bestMaxScore = attempt.maxScore;
            }
            if (attempt.submittedAt &&
                (!existing.latestSubmittedAt || attempt.submittedAt > existing.latestSubmittedAt)) {
                existing.latestSubmittedAt = attempt.submittedAt;
            }
            map.set(attempt.testLessonId, existing);
        }
        return map;
    }
    resolveLessonStatus(lessonType, progressStatus, submittedAttemptsCount) {
        if (lessonType === client_1.LessonType.TEST) {
            if (submittedAttemptsCount > 0) {
                return client_1.LessonProgressStatus.COMPLETED;
            }
            if (progressStatus === client_1.LessonProgressStatus.IN_PROGRESS ||
                progressStatus === client_1.LessonProgressStatus.COMPLETED) {
                return client_1.LessonProgressStatus.IN_PROGRESS;
            }
            return client_1.LessonProgressStatus.NOT_STARTED;
        }
        return progressStatus ?? client_1.LessonProgressStatus.NOT_STARTED;
    }
    resolveAggregateStatus(completed, inProgress, total) {
        if (total === 0) {
            return client_1.LessonProgressStatus.NOT_STARTED;
        }
        if (completed === total) {
            return client_1.LessonProgressStatus.COMPLETED;
        }
        if (completed > 0 || inProgress > 0) {
            return client_1.LessonProgressStatus.IN_PROGRESS;
        }
        return client_1.LessonProgressStatus.NOT_STARTED;
    }
    resolveLastActivityAt(lessonProgress, submittedAttempts) {
        let maxDate = null;
        for (const row of lessonProgress) {
            if (!maxDate || row.updatedAt > maxDate) {
                maxDate = row.updatedAt;
            }
        }
        for (const attempt of submittedAttempts) {
            if (attempt.submittedAt &&
                (!maxDate || attempt.submittedAt > maxDate)) {
                maxDate = attempt.submittedAt;
            }
        }
        return maxDate ? maxDate.toISOString() : null;
    }
    averageNullable(values) {
        const numbers = values.filter((value) => value !== null && value !== undefined);
        if (numbers.length === 0) {
            return null;
        }
        return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2));
    }
    maxNullable(values) {
        const numbers = values.filter((value) => value !== null && value !== undefined);
        if (numbers.length === 0) {
            return null;
        }
        return Math.max(...numbers);
    }
    countLessonTypes(modules) {
        let lecture = 0;
        let webinar = 0;
        let test = 0;
        for (const module of modules) {
            for (const lesson of module.lessons) {
                if (lesson.type === client_1.LessonType.LECTURE) {
                    lecture += 1;
                }
                else if (lesson.type === client_1.LessonType.WEBINAR) {
                    webinar += 1;
                }
                else if (lesson.type === client_1.LessonType.TEST) {
                    test += 1;
                }
            }
        }
        return { lecture, webinar, test };
    }
    async getPublishedModulesWithLessons(courseId) {
        return this.prisma.courseModule.findMany({
            where: {
                courseId,
            },
            orderBy: {
                orderIndex: 'asc',
            },
            select: {
                id: true,
                title: true,
                description: true,
                orderIndex: true,
                lessons: {
                    where: {
                        isPublished: true,
                    },
                    orderBy: {
                        orderIndex: 'asc',
                    },
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        orderIndex: true,
                        moduleId: true,
                    },
                },
            },
        });
    }
    async resolveContext(studentId, lessonId) {
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: lessonId },
            select: {
                id: true,
                type: true,
                isPublished: true,
                module: {
                    select: {
                        courseId: true,
                    },
                },
            },
        });
        if (!lesson) {
            throw new common_1.NotFoundException('Lesson not found');
        }
        if (!lesson.isPublished) {
            throw new common_1.ForbiddenException('Lesson is not published');
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
        return {
            enrollmentId: enrollment.id,
            courseId: lesson.module.courseId,
            lessonType: lesson.type,
        };
    }
    async assertTeacherOwnsCourse(teacherId, courseId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { teacherId: true },
        });
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        if (course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can view progress only for your own courses');
        }
    }
};
exports.ProgressService = ProgressService;
exports.ProgressService = ProgressService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProgressService);
//# sourceMappingURL=progress.service.js.map