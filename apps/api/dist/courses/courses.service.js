"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let CoursesService = class CoursesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listPublic(page = 1, limit = 12) {
        const safeLimit = Math.min(limit, 50);
        const skip = (page - 1) * safeLimit;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.course.findMany({
                where: { status: client_1.CourseStatus.PUBLISHED },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: safeLimit,
                select: {
                    id: true,
                    title: true,
                    shortDescription: true,
                    coverImageUrl: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    teacher: {
                        select: { id: true, fullName: true },
                    },
                    _count: {
                        select: { modules: true, enrollments: true },
                    },
                },
            }),
            this.prisma.course.count({
                where: { status: client_1.CourseStatus.PUBLISHED },
            }),
        ]);
        return {
            items,
            page,
            limit: safeLimit,
            total,
        };
    }
    async getPublicById(courseId) {
        const course = await this.prisma.course.findFirst({
            where: {
                id: courseId,
                status: client_1.CourseStatus.PUBLISHED,
            },
            include: {
                teacher: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                modules: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        lessons: {
                            where: { isPublished: true },
                            orderBy: { orderIndex: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                type: true,
                                orderIndex: true,
                                isPublished: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        modules: true,
                        enrollments: true,
                    },
                },
            },
        });
        if (!course) {
            throw new common_1.NotFoundException('Published course not found');
        }
        return course;
    }
    async listTeacherCourses(teacherId) {
        return this.prisma.course.findMany({
            where: { teacherId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                shortDescription: true,
                coverImageUrl: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { modules: true, enrollments: true },
                },
            },
        });
    }
    async getStudentCourseById(studentId, courseId) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId,
                },
            },
            select: {
                id: true,
                status: true,
                enrolledAt: true,
            },
        });
        if (!enrollment || enrollment.status !== client_1.EnrollmentStatus.ACTIVE) {
            throw new common_1.ForbiddenException('You are not enrolled in this course');
        }
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            include: {
                teacher: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                modules: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        lessons: {
                            where: { isPublished: true },
                            orderBy: { orderIndex: 'asc' },
                            select: {
                                id: true,
                                moduleId: true,
                                type: true,
                                title: true,
                                description: true,
                                orderIndex: true,
                                isPublished: true,
                                progress: {
                                    where: { studentId },
                                    select: {
                                        id: true,
                                        status: true,
                                        completedAt: true,
                                        updatedAt: true,
                                    },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        modules: true,
                        enrollments: true,
                    },
                },
            },
        });
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        return {
            ...course,
            enrollment: {
                id: enrollment.id,
                enrolledAt: enrollment.enrolledAt,
            },
        };
    }
    async getTeacherCourseById(teacherId, courseId) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        return this.prisma.course.findUnique({
            where: { id: courseId },
            include: {
                modules: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { orderIndex: 'asc' },
                        },
                    },
                },
                _count: {
                    select: { modules: true, enrollments: true },
                },
            },
        });
    }
    async create(teacherId, dto) {
        const slug = await this.generateUniqueSlug(dto.title);
        return this.prisma.course.create({
            data: {
                teacherId,
                title: dto.title,
                shortDescription: dto.shortDescription,
                fullDescription: dto.fullDescription,
                coverImageUrl: dto.coverImageUrl,
                slug,
                status: dto.status ?? client_1.CourseStatus.DRAFT,
            },
        });
    }
    async update(teacherId, courseId, dto) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        const data = {
            title: dto.title,
            shortDescription: dto.shortDescription,
            fullDescription: dto.fullDescription,
            coverImageUrl: dto.coverImageUrl === undefined ? undefined : dto.coverImageUrl,
            status: dto.status,
        };
        if (dto.title) {
            data.slug = await this.generateUniqueSlug(dto.title, courseId);
        }
        return this.prisma.course.update({
            where: { id: courseId },
            data,
        });
    }
    async remove(teacherId, courseId) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        await this.prisma.course.delete({
            where: { id: courseId },
        });
        return { success: true };
    }
    async assertTeacherOwnsCourse(teacherId, courseId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, teacherId: true },
        });
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        if (course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can manage only your own courses');
        }
    }
    async generateUniqueSlug(title, excludeCourseId) {
        const base = this.buildSlug(title);
        let slug = base;
        let counter = 2;
        while (true) {
            const existing = await this.prisma.course.findFirst({
                where: {
                    slug,
                    ...(excludeCourseId ? { NOT: { id: excludeCourseId } } : {}),
                },
                select: { id: true },
            });
            if (!existing) {
                return slug;
            }
            slug = `${base}-${counter}`;
            counter += 1;
        }
    }
    buildSlug(title) {
        const slug = title
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        return slug.length > 0 ? slug : 'course';
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map