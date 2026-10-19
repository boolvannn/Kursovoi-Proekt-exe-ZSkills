"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const publicUserSelect = {
    id: true,
    email: true,
    fullName: true,
    group: true,
    role: true,
    createdAt: true,
    updatedAt: true,
};
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCurrentProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: publicUserSelect,
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async findMany(role) {
        return this.prisma.user.findMany({
            where: role ? { role } : undefined,
            select: publicUserSelect,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: publicUserSelect,
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async listTeachers() {
        return this.findMany(client_1.UserRole.TEACHER);
    }
    async listStudents() {
        return this.findMany(client_1.UserRole.STUDENT);
    }
    async createTeacher(dto) {
        return this.createUserWithRole(dto, client_1.UserRole.TEACHER);
    }
    async createStudent(dto) {
        return this.createUserWithRole(dto, client_1.UserRole.STUDENT);
    }
    async createUserWithRole(dto, role) {
        const normalizedEmail = dto.email.toLowerCase();
        const existing = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        return this.prisma.user.create({
            data: {
                email: normalizedEmail,
                passwordHash,
                fullName: dto.fullName.trim(),
                group: dto.group ?? null,
                role,
            },
            select: publicUserSelect,
        });
    }
    async updateStudent(id, dto) {
        const student = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, role: true, email: true },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        if (student.role !== client_1.UserRole.STUDENT) {
            throw new common_1.BadRequestException('User is not a student');
        }
        const nextEmail = dto.email?.toLowerCase();
        if (nextEmail && nextEmail !== student.email) {
            const existing = await this.prisma.user.findUnique({
                where: { email: nextEmail },
                select: { id: true },
            });
            if (existing) {
                throw new common_1.ConflictException('User with this email already exists');
            }
        }
        return this.prisma.user.update({
            where: { id },
            data: {
                email: nextEmail,
                fullName: dto.fullName?.trim(),
                group: dto.group === undefined ? undefined : dto.group,
            },
            select: publicUserSelect,
        });
    }
    async updateTeacher(id, dto) {
        const teacher = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, role: true, email: true },
        });
        if (!teacher) {
            throw new common_1.NotFoundException('Teacher not found');
        }
        if (teacher.role !== client_1.UserRole.TEACHER) {
            throw new common_1.BadRequestException('User is not a teacher');
        }
        const nextEmail = dto.email?.toLowerCase();
        if (nextEmail && nextEmail !== teacher.email) {
            const existing = await this.prisma.user.findUnique({
                where: { email: nextEmail },
                select: { id: true },
            });
            if (existing) {
                throw new common_1.ConflictException('User with this email already exists');
            }
        }
        return this.prisma.user.update({
            where: { id },
            data: {
                email: nextEmail,
                fullName: dto.fullName?.trim(),
            },
            select: publicUserSelect,
        });
    }
    async removeStudent(id) {
        const student = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, role: true },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        if (student.role !== client_1.UserRole.STUDENT) {
            throw new common_1.BadRequestException('User is not a student');
        }
        await this.prisma.$transaction([
            this.prisma.lessonProgress.deleteMany({ where: { studentId: id } }),
            this.prisma.testAttempt.deleteMany({ where: { studentId: id } }),
            this.prisma.enrollment.deleteMany({ where: { studentId: id } }),
            this.prisma.user.delete({ where: { id } }),
        ]);
        return { success: true };
    }
    async removeTeacher(id) {
        const teacher = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                role: true,
                _count: {
                    select: {
                        teacherCourses: true,
                    },
                },
            },
        });
        if (!teacher) {
            throw new common_1.NotFoundException('Teacher not found');
        }
        if (teacher.role !== client_1.UserRole.TEACHER) {
            throw new common_1.BadRequestException('User is not a teacher');
        }
        if (teacher._count.teacherCourses > 0) {
            throw new common_1.BadRequestException('Cannot delete teacher with existing courses');
        }
        await this.prisma.user.delete({
            where: { id },
        });
        return { success: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map