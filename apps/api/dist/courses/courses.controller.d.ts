import { AuthUser } from '../common/types/auth-user.type';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListPublicCoursesQueryDto } from './dto/list-public-courses.query.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CoursesService } from './courses.service';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    listPublic(query: ListPublicCoursesQueryDto): Promise<{
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
    publicById(courseId: string): Promise<{
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
    myCourses(user: AuthUser): Promise<{
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
    studentCourseById(user: AuthUser, courseId: string): Promise<{
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
    myCourseById(user: AuthUser, courseId: string): Promise<({
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
    create(user: AuthUser, dto: CreateCourseDto): Promise<{
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
    update(user: AuthUser, courseId: string, dto: UpdateCourseDto): Promise<{
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
    remove(user: AuthUser, courseId: string): Promise<{
        success: boolean;
    }>;
}
