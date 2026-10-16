declare class ReorderModuleItemDto {
    moduleId: string;
    orderIndex: number;
}
export declare class ReorderModulesDto {
    courseId: string;
    items: ReorderModuleItemDto[];
}
export {};
