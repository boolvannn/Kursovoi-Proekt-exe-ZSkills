import { AuthUser } from '../common/types/auth-user.type';
import { ImportStudentsDto } from '../users/dto/import-students.dto';
import { CreateCourseStudentDto } from './dto/create-course-student.dto';
import { SearchCourseStudentsQueryDto } from './dto/search-course-students.query.dto';
import { EnrollmentsService } from './enrollments.service';
type UploadedCsvFile = {
    buffer: Buffer;
};
export declare class EnrollmentsController {
    private readonly enrollmentsService;
    constructor(enrollmentsService: EnrollmentsService);
    my(user: AuthUser): Promise<({
        course: {
            teacher: {
                fullName: string;
                id: string;
            };
            modules: {
                id: string;
                title: string;
                orderIndex: number;
                lessons: {
                    id: string;
                    title: string;
                    orderIndex: number;
                    isPublished: boolean;
                    moduleId: string;
                    type: import(".prisma/client").$Enums.LessonType;
                    description: string | null;
                }[];
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            shortDescription: string;
            fullDescription: string;
            coverImageUrl: string | null;
            status: import(".prisma/client").$Enums.CourseStatus;
            teacherId: string;
            slug: string;
        };
        lessonProgress: {
            updatedAt: Date;
            status: import(".prisma/client").$Enums.LessonProgressStatus;
            lessonId: string;
            completedAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EnrollmentStatus;
        courseId: string;
        studentId: string;
        invitationId: string | null;
        enrolledAt: Date;
        removedAt: Date | null;
        removedById: string | null;
    })[]>;
    byCourse(user: AuthUser, courseId: string): Promise<({
        student: {
            email: string;
            fullName: string;
            id: string;
            group: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EnrollmentStatus;
        courseId: string;
        studentId: string;
        invitationId: string | null;
        enrolledAt: Date;
        removedAt: Date | null;
        removedById: string | null;
    })[]>;
    searchStudentsForCourse(user: AuthUser, courseId: string, query: SearchCourseStudentsQueryDto): Promise<{
        isEnrolled: boolean;
        email: string;
        fullName: string;
        id: string;
        group: string | null;
    }[]>;
    createStudentForCourse(user: AuthUser, courseId: string, dto: CreateCourseStudentDto): Promise<{
        enrollment: {
            student: {
                email: string;
                fullName: string;
                id: string;
                group: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.EnrollmentStatus;
            courseId: string;
            studentId: string;
            invitationId: string | null;
            enrolledAt: Date;
            removedAt: Date | null;
            removedById: string | null;
        };
        student: {
            email: string;
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
            id: string;
            group: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        credentials: {
            email: string;
            password: string;
        };
    }>;
    previewCourseStudentsImport(user: AuthUser, courseId: string, file: UploadedCsvFile): Promise<import("../users/student-import.service").StudentImportPreview>;
    importCourseStudents(user: AuthUser, courseId: string, file: UploadedCsvFile, dto: ImportStudentsDto): Promise<import("../users/student-import.service").StudentImportResult>;
    enrollExistingStudentForCourse(user: AuthUser, courseId: string, studentId: string): Promise<{
        student: {
            email: string;
            fullName: string;
            id: string;
            group: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EnrollmentStatus;
        courseId: string;
        studentId: string;
        invitationId: string | null;
        enrolledAt: Date;
        removedAt: Date | null;
        removedById: string | null;
    }>;
    remove(user: AuthUser, enrollmentId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EnrollmentStatus;
        courseId: string;
        studentId: string;
        invitationId: string | null;
        enrolledAt: Date;
        removedAt: Date | null;
        removedById: string | null;
    }>;
}
export {};
