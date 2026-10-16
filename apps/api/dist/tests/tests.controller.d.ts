import { AuthUser } from '../common/types/auth-user.type';
import { SubmitTestAttemptDto } from './dto/submit-test-attempt.dto';
import { UpsertTestContentDto } from './dto/upsert-test-content.dto';
import { TestsService } from './tests.service';
export declare class TestsController {
    private readonly testsService;
    constructor(testsService: TestsService);
    lessonContentForTeacher(user: AuthUser, lessonId: string): Promise<{
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
            matchingPairs: {
                leftId: string;
                left: string;
                rightId: string;
                right: string;
            }[];
            orderingItems: {
                id: string;
                text: string;
            }[];
        }[];
    }>;
    upsertLessonContentForTeacher(user: AuthUser, lessonId: string, dto: UpsertTestContentDto): Promise<{
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
            matchingPairs: {
                leftId: string;
                left: string;
                rightId: string;
                right: string;
            }[];
            orderingItems: {
                id: string;
                text: string;
            }[];
        }[];
    }>;
    studentLessonForPassing(user: AuthUser, lessonId: string): Promise<{
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
            options: {
                id: string;
                text: string;
                order: number;
            }[];
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
            options: {
                id: string;
                text: string;
                order: number;
            }[];
            orderingItems: {
                id: string;
                text: string;
            }[];
            matchingLeftItems?: undefined;
            matchingRightItems?: undefined;
        } | {
            id: string;
            text: string;
            explanation: string | null;
            type: "FREE_TEXT";
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
    startAttempt(user: AuthUser, lessonId: string): Promise<{
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
    submitAttempt(user: AuthUser, attemptId: string, dto: SubmitTestAttemptDto): Promise<{
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
                matchingAnswer: import("@prisma/client/runtime/library").JsonValue | null;
                orderingAnswer: import("@prisma/client/runtime/library").JsonValue | null;
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
                correctMatchingPairs: {
                    leftId: string;
                    left: string;
                    rightId: string;
                    right: string;
                }[];
                selectedOrderingItemIds: string[];
                correctOrderingItemIds: string[];
                orderingItems: {
                    id: string;
                    text: string;
                }[];
                options: {
                    id: string;
                    text: string;
                    isCorrect: boolean;
                }[];
            }[];
        };
    }>;
    myAttempts(user: AuthUser, lessonId: string): Promise<({
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
            matchingAnswer: import("@prisma/client/runtime/library").JsonValue | null;
            orderingAnswer: import("@prisma/client/runtime/library").JsonValue | null;
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
    attemptResult(user: AuthUser, attemptId: string): Promise<{
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
            correctMatchingPairs: {
                leftId: string;
                left: string;
                rightId: string;
                right: string;
            }[];
            selectedOrderingItemIds: string[];
            correctOrderingItemIds: string[];
            orderingItems: {
                id: string;
                text: string;
            }[];
            options: {
                id: string;
                text: string;
            }[];
        }[];
    }>;
    lessonAttempts(user: AuthUser, lessonId: string): Promise<({
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
}
