import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitTestAttemptDto } from './dto/submit-test-attempt.dto';
import { UpsertTestContentDto } from './dto/upsert-test-content.dto';
type MatchingPairItem = {
    leftId: string;
    left: string;
    rightId: string;
    right: string;
};
type OrderingItem = {
    id: string;
    text: string;
};
export declare class TestsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLessonTestContentForTeacher(teacherId: string, lessonId: string): Promise<{
        lessonId: string;
        passingScore: number | null;
        allowMultipleAttempts: boolean;
        maxAttempts: number | null;
        timeLimitMinutes: number | null;
        lesson: {
            id: string;
            title: string;
            orderIndex: number;
            isPublished: boolean;
            moduleId: string;
            description: string | null;
        };
        questions: {
            id: string;
            text: string;
            explanation: string | null;
            type: import(".prisma/client").$Enums.QuestionType;
            order: number;
            points: number;
            options: {
                id: string;
                text: string;
                isCorrect: boolean;
                order: number;
            }[];
            acceptedAnswers: string[];
            matchingPairs: MatchingPairItem[];
            orderingItems: OrderingItem[];
        }[];
    }>;
    upsertLessonTestContentForTeacher(teacherId: string, lessonId: string, dto: UpsertTestContentDto): Promise<{
        lessonId: string;
        passingScore: number | null;
        allowMultipleAttempts: boolean;
        maxAttempts: number | null;
        timeLimitMinutes: number | null;
        lesson: {
            id: string;
            title: string;
            orderIndex: number;
            isPublished: boolean;
            moduleId: string;
            description: string | null;
        };
        questions: {
            id: string;
            text: string;
            explanation: string | null;
            type: import(".prisma/client").$Enums.QuestionType;
            order: number;
            points: number;
            options: {
                id: string;
                text: string;
                isCorrect: boolean;
                order: number;
            }[];
            acceptedAnswers: string[];
            matchingPairs: MatchingPairItem[];
            orderingItems: OrderingItem[];
        }[];
    }>;
    getStudentTestForPassing(studentId: string, lessonId: string): Promise<{
        lesson: {
            id: string;
            title: string;
            description: string | null;
            module: {
                id: string;
                title: string;
                courseId: string;
                courseTitle: string;
            };
        };
        settings: {
            passingScore: number | null;
            allowMultipleAttempts: boolean;
            maxAttempts: number | null;
            timeLimitMinutes: number | null;
        };
        questions: ({
            id: string;
            text: string;
            explanation: string | null;
            type: "MATCHING";
            order: number;
            points: number;
            options: Array<{
                id: string;
                text: string;
                order: number;
            }>;
            matchingLeftItems: {
                id: string;
                text: string;
            }[];
            matchingRightItems: {
                id: string;
                text: string;
            }[];
            orderingItems?: undefined;
        } | {
            id: string;
            text: string;
            explanation: string | null;
            type: "ORDERING";
            order: number;
            points: number;
            options: Array<{
                id: string;
                text: string;
                order: number;
            }>;
            orderingItems: OrderingItem[];
            matchingLeftItems?: undefined;
            matchingRightItems?: undefined;
        } | {
            id: string;
            text: string;
            explanation: string | null;
            type: "FREE_TEXT";
            order: number;
            points: number;
            options: Array<{
                id: string;
                text: string;
                order: number;
            }>;
            matchingLeftItems?: undefined;
            matchingRightItems?: undefined;
            orderingItems?: undefined;
        } | {
            id: string;
            text: string;
            explanation: string | null;
            type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
            order: number;
            points: number;
            options: {
                id: string;
                text: string;
                order: number;
            }[];
            matchingLeftItems?: undefined;
            matchingRightItems?: undefined;
            orderingItems?: undefined;
        })[];
        attempts: ({
            id: string;
            status: import(".prisma/client").$Enums.TestAttemptStatus;
            startedAt: Date;
            attemptNumber: number;
            submittedAt: Date | null;
            score: number | null;
            maxScore: number | null;
            scorePercent: number | null;
            isPassed: boolean | null;
        } & {
            expiresAt: Date | null;
        })[];
    }>;
    startAttempt(studentId: string, lessonId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TestAttemptStatus;
        studentId: string;
        enrollmentId: string;
        startedAt: Date;
        testLessonId: string;
        attemptNumber: number;
        submittedAt: Date | null;
        score: number | null;
        maxScore: number | null;
        scorePercent: number | null;
        isPassed: boolean | null;
    } & {
        expiresAt: Date | null;
    }>;
    submitAttempt(studentId: string, attemptId: string, dto: SubmitTestAttemptDto): Promise<{
        attempt: {
            answers: ({
                selectedOptions: {
                    attemptAnswerId: string;
                    optionId: string;
                    selectedAt: Date;
                }[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                questionId: string;
                textAnswer: string | null;
                isCorrect: boolean;
                attemptId: string;
                pointsAwarded: number;
                matchingAnswer: Prisma.JsonValue | null;
                orderingAnswer: Prisma.JsonValue | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.TestAttemptStatus;
            studentId: string;
            enrollmentId: string;
            startedAt: Date;
            testLessonId: string;
            attemptNumber: number;
            submittedAt: Date | null;
            score: number | null;
            maxScore: number | null;
            scorePercent: number | null;
            isPassed: boolean | null;
        };
        result: {
            score: number;
            maxScore: number;
            scorePercent: number;
            isPassed: boolean;
            questions: {
                questionId: string;
                text: string;
                explanation: string | null;
                type: import(".prisma/client").$Enums.QuestionType;
                points: number;
                pointsAwarded: number;
                isCorrect: boolean;
                selectedOptionIds: string[];
                correctOptionIds: string[];
                selectedTextAnswer: string | null;
                acceptedAnswers: string[];
                selectedMatchingPairs: {
                    leftId: string;
                    left: string;
                    correctRightId: string;
                    correctRight: string;
                    selectedRightId: string | null;
                    selectedRight: string | null | undefined;
                }[];
                correctMatchingPairs: MatchingPairItem[];
                selectedOrderingItemIds: string[];
                correctOrderingItemIds: string[];
                orderingItems: OrderingItem[];
                options: {
                    id: string;
                    text: string;
                    isCorrect: boolean;
                }[];
            }[];
        };
    }>;
    listMyAttempts(studentId: string, lessonId: string): Promise<({
        answers: ({
            question: {
                id: string;
                type: import(".prisma/client").$Enums.QuestionType;
                text: string;
                explanation: string | null;
                points: number;
            };
            selectedOptions: ({
                option: {
                    id: string;
                    text: string;
                };
            } & {
                attemptAnswerId: string;
                optionId: string;
                selectedAt: Date;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            questionId: string;
            textAnswer: string | null;
            isCorrect: boolean;
            attemptId: string;
            pointsAwarded: number;
            matchingAnswer: Prisma.JsonValue | null;
            orderingAnswer: Prisma.JsonValue | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TestAttemptStatus;
        studentId: string;
        enrollmentId: string;
        startedAt: Date;
        testLessonId: string;
        attemptNumber: number;
        submittedAt: Date | null;
        score: number | null;
        maxScore: number | null;
        scorePercent: number | null;
        isPassed: boolean | null;
    })[]>;
    getAttemptResult(studentId: string, attemptId: string): Promise<{
        attempt: {
            id: string;
            attemptNumber: number;
            status: "SUBMITTED";
            score: number | null;
            maxScore: number | null;
            scorePercent: number | null;
            isPassed: boolean | null;
            startedAt: Date;
            submittedAt: Date | null;
        };
        lesson: {
            id: string;
            title: string;
            description: string | null;
            moduleTitle: string;
            courseId: string;
            courseTitle: string;
        };
        questions: {
            questionId: string;
            text: string;
            explanation: string | null;
            type: import(".prisma/client").$Enums.QuestionType;
            points: number;
            isCorrect: boolean;
            pointsAwarded: number;
            selectedOptionIds: string[];
            correctOptionIds: string[];
            selectedTextAnswer: string | null;
            acceptedAnswers: string[];
            selectedMatchingPairs: {
                leftId: string;
                left: string;
                correctRightId: string;
                correctRight: string;
                selectedRightId: string | null;
                selectedRight: string | null | undefined;
            }[];
            correctMatchingPairs: MatchingPairItem[];
            selectedOrderingItemIds: string[];
            correctOrderingItemIds: string[];
            orderingItems: OrderingItem[];
            options: {
                id: string;
                text: string;
            }[];
        }[];
    }>;
    listLessonAttemptsForTeacher(teacherId: string, lessonId: string): Promise<({
        student: {
            email: string;
            fullName: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TestAttemptStatus;
        studentId: string;
        enrollmentId: string;
        startedAt: Date;
        testLessonId: string;
        attemptNumber: number;
        submittedAt: Date | null;
        score: number | null;
        maxScore: number | null;
        scorePercent: number | null;
        isPassed: boolean | null;
    })[]>;
    private finalizeExpiredAttemptsForStudentLesson;
    private finalizeAttempt;
    private mapAttemptWithExpiresAt;
    private isAttemptExpired;
    private resolveAttemptExpiresAt;
    private getStudentTestContext;
    private calculateScore;
    private validateTestContent;
    private buildResultPayload;
    private mapTeacherTestContent;
    private prepareQuestionContentForPersistence;
    private parseAcceptedAnswers;
    private parseMatchingPairs;
    private parseOrderingItems;
    private parseSubmittedMatchingPairs;
    private parseSubmittedOrderingItemIds;
    private normalizeSubmittedMatchingPairs;
    private normalizeSubmittedOrderingItemIds;
    private expandMatchingSelection;
    private normalizeComparableText;
    private uniqueNormalizedStrings;
    private shuffleArray;
    private isUuid;
    private getOwnedTestLessonForTeacher;
}
export {};
