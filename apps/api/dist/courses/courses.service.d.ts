import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
export declare class CoursesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listPublic(page?: number, limit?: number): Promise<{
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            shortDescription: string;
            coverImageUrl: string | null;
            status: import(".prisma/client").$Enums.CourseStatus;
            teacher: {
                fullName: string;
                id: string;
            };
            _count: {
                modules: number;
                enrollments: number;
            };
        }[];
        page: number;
        limit: number;
        total: number;
    }>;
    getPublicById(courseId: string): Promise<{
        teacher: {
            fullName: string;
            id: string;
        };
        modules: ({
            lessons: {
                id: string;
                title: string;
                orderIndex: number;
                isPublished: boolean;
                type: import(".prisma/client").$Enums.LessonType;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            orderIndex: number;
            description: string | null;
            courseId: string;
        })[];
        _count: {
            modules: number;
            enrollments: number;
        };
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
    }>;
    listTeacherCourses(teacherId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        shortDescription: string;
        coverImageUrl: string | null;
        status: import(".prisma/client").$Enums.CourseStatus;
        _count: {
            modules: number;
            enrollments: number;
        };
    }[]>;
    getStudentCourseById(studentId: string, courseId: string): Promise<{
        enrollment: {
            id: string;
            enrolledAt: Date;
        };
        teacher: {
            fullName: string;
            id: string;
        };
        modules: ({
            lessons: {
                id: string;
                title: string;
                orderIndex: number;
                isPublished: boolean;
                moduleId: string;
                type: import(".prisma/client").$Enums.LessonType;
                description: string | null;
                progress: {
                    id: string;
                    updatedAt: Date;
                    status: import(".prisma/client").$Enums.LessonProgressStatus;
                    completedAt: Date | null;
                }[];
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            orderIndex: number;
            description: string | null;
            courseId: string;
        })[];
        _count: {
            modules: number;
            enrollments: number;
        };
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
    }>;
    getTeacherCourseById(teacherId: string, courseId: string): Promise<({
        modules: ({
            lessons: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                orderIndex: number;
                isPublished: boolean;
                moduleId: string;
                type: import(".prisma/client").$Enums.LessonType;
                description: string | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            orderIndex: number;
            description: string | null;
            courseId: string;
        })[];
        _count: {
            modules: number;
            enrollments: number;
        };
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
    }) | null>;
    create(teacherId: string, dto: CreateCourseDto): Promise<{
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
    }>;
    update(teacherId: string, courseId: string, dto: UpdateCourseDto): Promise<{
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
    }>;
    remove(teacherId: string, courseId: string): Promise<{
        success: boolean;
    }>;
    private assertTeacherOwnsCourse;
    private generateUniqueSlug;
    private buildSlug;
}
