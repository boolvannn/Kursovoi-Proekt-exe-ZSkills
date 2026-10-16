import { PrismaService } from '../prisma/prisma.service';
import { StudentImportService } from '../users/student-import.service';
import { UsersService } from '../users/users.service';
import { CreateCourseStudentDto } from './dto/create-course-student.dto';
import { SearchCourseStudentsQueryDto } from './dto/search-course-students.query.dto';
export declare class EnrollmentsService {
    private readonly prisma;
    private readonly usersService;
    private readonly studentImportService;
    constructor(prisma: PrismaService, usersService: UsersService, studentImportService: StudentImportService);
    listMyEnrollments(studentId: string): Promise<({
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
    listCourseEnrollments(teacherId: string, courseId: string): Promise<({
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
    searchStudentsForCourse(teacherId: string, courseId: string, filters: SearchCourseStudentsQueryDto): Promise<{
        isEnrolled: boolean;
        email: string;
        fullName: string;
        id: string;
        group: string | null;
    }[]>;
    createStudentForCourse(teacherId: string, courseId: string, dto: CreateCourseStudentDto): Promise<{
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
    previewCourseStudentImport(teacherId: string, courseId: string, csvBuffer: Buffer): Promise<import("../users/student-import.service").StudentImportPreview>;
    importStudentsForCourse(teacherId: string, courseId: string, csvBuffer: Buffer, enrollToCourse?: boolean): Promise<import("../users/student-import.service").StudentImportResult>;
    enrollExistingStudentForCourse(teacherId: string, courseId: string, studentId: string): Promise<{
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
    removeStudentFromCourse(teacherId: string, enrollmentId: string): Promise<{
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
    private assertTeacherOwnsCourse;
}
