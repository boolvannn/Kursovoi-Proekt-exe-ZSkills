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
exports.EnrollmentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const student_import_service_1 = require("../users/student-import.service");
const users_service_1 = require("../users/users.service");
let EnrollmentsService = class EnrollmentsService {
    constructor(prisma, usersService, studentImportService) {
        this.prisma = prisma;
        this.usersService = usersService;
        this.studentImportService = studentImportService;
    }
    async listMyEnrollments(studentId) {
        return this.prisma.enrollment.findMany({
            where: {
                studentId,
                status: client_1.EnrollmentStatus.ACTIVE,
            },
            include: {
                course: {
                    include: {
                        teacher: { select: { id: true, fullName: true } },
                        modules: {
                            orderBy: { orderIndex: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                orderIndex: true,
                                lessons: {
                                    where: { isPublished: true },
                                    orderBy: { orderIndex: 'asc' },
                                    select: {
                                        id: true,
                                        moduleId: true,
                                        title: true,
                                        description: true,
                                        type: true,
                                        orderIndex: true,
                                        isPublished: true,
                                    },
                                },
                            },
                        },
                    },
                },
                lessonProgress: {
                    select: {
                        lessonId: true,
                        status: true,
                        completedAt: true,
                        updatedAt: true,
                    },
                },
            },
            orderBy: { enrolledAt: 'desc' },
        });
    }
    async listCourseEnrollments(teacherId, courseId) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        return this.prisma.enrollment.findMany({
            where: {
                courseId,
                status: client_1.EnrollmentStatus.ACTIVE,
            },
            include: {
                student: {
                    select: { id: true, fullName: true, email: true, group: true },
                },
            },
            orderBy: { enrolledAt: 'desc' },
        });
    }
    async searchStudentsForCourse(teacherId, courseId, filters) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
        const students = await this.prisma.user.findMany({
            where: {
                role: client_1.UserRole.STUDENT,
                ...(filters.fullName
                    ? {
                        fullName: {
                            contains: filters.fullName,
                            mode: 'insensitive',
                        },
                    }
                    : {}),
                ...(filters.group
                    ? {
                        group: {
                            contains: filters.group,
                            mode: 'insensitive',
                        },
                    }
                    : {}),
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                group: true,
            },
            orderBy: [{ fullName: 'asc' }, { createdAt: 'desc' }],
            take: limit,
        });
        if (students.length === 0) {
            return [];
        }
        const activeEnrollments = await this.prisma.enrollment.findMany({
            where: {
                courseId,
                status: client_1.EnrollmentStatus.ACTIVE,
                studentId: {
                    in: students.map((student) => student.id),
                },
            },
            select: {
                studentId: true,
            },
        });
        const enrolledStudentIds = new Set(activeEnrollments.map((enrollment) => enrollment.studentId));
        return students.map((student) => ({
            ...student,
            isEnrolled: enrolledStudentIds.has(student.id),
        }));
    }
    async createStudentForCourse(teacherId, courseId, dto) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        const createdStudent = await this.usersService.createStudent(dto);
        const enrollment = await this.prisma.enrollment.create({
            data: {
                courseId,
                studentId: createdStudent.id,
                status: client_1.EnrollmentStatus.ACTIVE,
            },
            include: {
                student: {
                    select: { id: true, fullName: true, email: true, group: true },
                },
            },
        });
        if (!enrollment.student) {
            throw new common_1.BadRequestException('Failed to enroll created student');
        }
        return {
            enrollment,
            student: createdStudent,
            credentials: {
                email: createdStudent.email,
                password: dto.password,
            },
        };
    }
    async previewCourseStudentImport(teacherId, courseId, csvBuffer) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        return this.studentImportService.preview(csvBuffer);
    }
    async importStudentsForCourse(teacherId, courseId, csvBuffer, enrollToCourse = false) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        return this.studentImportService.importStudents(csvBuffer, {
            importedById: teacherId,
            courseId,
            enrollToCourse,
        });
    }
    async enrollExistingStudentForCourse(teacherId, courseId, studentId) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            select: { id: true, role: true },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        if (student.role !== client_1.UserRole.STUDENT) {
            throw new common_1.BadRequestException('User is not a student');
        }
        const existingEnrollment = await this.prisma.enrollment.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId,
                },
            },
            select: {
                id: true,
                status: true,
            },
        });
        if (existingEnrollment?.status === client_1.EnrollmentStatus.ACTIVE) {
            throw new common_1.BadRequestException('Student is already enrolled in this course');
        }
        if (existingEnrollment) {
            return this.prisma.enrollment.update({
                where: { id: existingEnrollment.id },
                data: {
                    status: client_1.EnrollmentStatus.ACTIVE,
                    enrolledAt: new Date(),
                    removedAt: null,
                    removedById: null,
                },
                include: {
                    student: {
                        select: { id: true, fullName: true, email: true, group: true },
                    },
                },
            });
        }
        return this.prisma.enrollment.create({
            data: {
                courseId,
                studentId,
                status: client_1.EnrollmentStatus.ACTIVE,
            },
            include: {
                student: {
                    select: { id: true, fullName: true, email: true, group: true },
                },
            },
        });
    }
    async removeStudentFromCourse(teacherId, enrollmentId) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                course: { select: { id: true, teacherId: true } },
            },
        });
        if (!enrollment) {
            throw new common_1.NotFoundException('Enrollment not found');
        }
        if (enrollment.course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can remove students only from your own courses');
        }
        return this.prisma.enrollment.update({
            where: { id: enrollmentId },
            data: {
                status: client_1.EnrollmentStatus.REMOVED,
                removedAt: new Date(),
                removedById: teacherId,
            },
        });
    }
    async assertTeacherOwnsCourse(teacherId, courseId) {
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { teacherId: true },
        });
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        if (course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can access only your own courses');
        }
    }
};
exports.EnrollmentsService = EnrollmentsService;
exports.EnrollmentsService = EnrollmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService,
        student_import_service_1.StudentImportService])
], EnrollmentsService);
//# sourceMappingURL=enrollments.service.js.map