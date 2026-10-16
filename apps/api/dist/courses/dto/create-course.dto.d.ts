import { CourseStatus } from '@prisma/client';
export declare class CreateCourseDto {
    title: string;
    shortDescription: string;
    fullDescription: string;
    coverImageUrl?: string;
    status?: CourseStatus;
}
