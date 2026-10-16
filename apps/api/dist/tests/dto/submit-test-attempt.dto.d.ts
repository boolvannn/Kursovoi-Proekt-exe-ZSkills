export declare class SubmitMatchingPairDto {
    leftId: string;
    rightId: string;
}
export declare class SubmitQuestionAnswerDto {
    questionId: string;
    optionIds?: string[];
    textAnswer?: string;
    matchingPairs?: SubmitMatchingPairDto[];
    orderingItemIds?: string[];
}
export declare class SubmitTestAttemptDto {
    answers: SubmitQuestionAnswerDto[];
}
