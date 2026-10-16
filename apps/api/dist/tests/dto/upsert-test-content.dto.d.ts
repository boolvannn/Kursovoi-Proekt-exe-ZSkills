import { QuestionType } from '@prisma/client';
declare class UpsertTestQuestionOptionDto {
    text: string;
    isCorrect: boolean;
}
declare class UpsertMatchingPairDto {
    leftId?: string;
    rightId?: string;
    left: string;
    right: string;
}
declare class UpsertOrderingItemDto {
    id?: string;
    text: string;
}
declare class UpsertTestQuestionDto {
    text: string;
    explanation?: string;
    type: QuestionType;
    points?: number;
    options?: UpsertTestQuestionOptionDto[];
    acceptedAnswers?: string[];
    matchingPairs?: UpsertMatchingPairDto[];
    orderingItems?: UpsertOrderingItemDto[];
}
export declare class UpsertTestContentDto {
    passingScore?: number;
    allowMultipleAttempts?: boolean;
    maxAttempts?: number;
    timeLimitMinutes?: number;
    questions: UpsertTestQuestionDto[];
}
export {};
