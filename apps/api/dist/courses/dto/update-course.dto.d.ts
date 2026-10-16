import { CourseStatus } from '@prisma/client';
export declare class UpdateCourseDto {
    title?: string;
    shortDescription?: string;
    fullDescription?: string;
    coverImageUrl?: string | null;
    status?: CourseStatus;
}
