import { ProgressService } from '../progress/progress.service';
export declare class StatisticsService {
    private readonly progressService;
    constructor(progressService: ProgressService);
    getCourseStatistics(teacherId: string, courseId: string): Promise<{
        course: {
            id: string;
            title: string;
        };
        summary: {
            students: number;
            lessons: {
                total: number;
                lecture: number;
                webinar: number;
                test: number;
            };
            completedLessonProgress: number;
            inProgressLessonProgress: number;
            notStartedLessonProgress: number;
            totalPossibleProgress: number;
            completionRatePercent: number;
            averageStudentCompletionPercent: number;
            studentsCompletedCourse: number;
            studentsAtRisk: number;
        };
        tests: {
            submittedAttempts: number;
            averageBestScorePercent: number | null;
        };
        students: {
            enrollmentId: string;
            student: {
                email: string;
                fullName: string;
                id: string;
                group: string | null;
            };
            progress: {
                totalLessons: number;
                completedLessons: number;
                inProgressLessons: number;
                notStartedLessons: number;
                completionRatePercent: number;
                status: import(".prisma/client").$Enums.LessonProgressStatus;
                lastActivityAt: string | null;
            };
            tests: {
                submittedAttempts: number;
                averageScorePercent: number | null;
                bestScorePercent: number | null;
            };
        }[];
    }>;
    listCourseStudentsStatistics(teacherId: string, courseId: string): Promise<{
        course: {
            id: string;
            title: string;
        };
        summary: {
            students: number;
            lessons: {
                total: number;
                lecture: number;
                webinar: number;
                test: number;
            };
            completedLessonProgress: number;
            inProgressLessonProgress: number;
            notStartedLessonProgress: number;
            totalPossibleProgress: number;
            completionRatePercent: number;
            averageStudentCompletionPercent: number;
            studentsCompletedCourse: number;
            studentsAtRisk: number;
        };
        tests: {
            submittedAttempts: number;
            averageBestScorePercent: number | null;
        };
        students: {
            enrollmentId: string;
            student: {
                email: string;
                fullName: string;
                id: string;
                group: string | null;
            };
            progress: {
                totalLessons: number;
                completedLessons: number;
                inProgressLessons: number;
                notStartedLessons: number;
                completionRatePercent: number;
                status: import(".prisma/client").$Enums.LessonProgressStatus;
                lastActivityAt: string | null;
            };
            tests: {
                submittedAttempts: number;
                averageScorePercent: number | null;
                bestScorePercent: number | null;
            };
        }[];
    }>;
    getStudentStatistics(teacherId: string, courseId: string, studentId: string): Promise<{
        course: {
            id: string;
            title: string;
        };
        student: {
            email: string;
            fullName: string;
            id: string;
            group: string | null;
        };
        enrollment: {
            id: string;
            enrolledAt: Date;
        };
        summary: {
            completedLessons: number;
            inProgressLessons: number;
            notStartedLessons: number;
            totalLessons: number;
            completionRatePercent: number;
            status: import(".prisma/client").$Enums.LessonProgressStatus;
        };
        tests: {
            submittedAttempts: number;
            averageScorePercent: number | null;
            bestScorePercent: number | null;
        };
        modules: {
            id: string;
            title: string;
            description: string | null;
            orderIndex: number;
            progress: {
                completedLessons: number;
                inProgressLessons: number;
                notStartedLessons: number;
                totalLessons: number;
                completionRatePercent: number;
                status: import(".prisma/client").$Enums.LessonProgressStatus;
            };
            lessons: {
                id: string;
                title: string;
                type: import(".prisma/client").$Enums.LessonType;
                orderIndex: number;
                status: import(".prisma/client").$Enums.LessonProgressStatus;
                startedAt: Date | null;
                lastViewedAt: Date | null;
                completedAt: Date | null;
                tests: {
                    attemptsCount: number;
                    bestScore: number | null;
                    bestMaxScore: number | null;
                    bestScorePercent: number | null;
                } | null;
            }[];
        }[];
        lastActivityAt: string | null;
    }>;
}
