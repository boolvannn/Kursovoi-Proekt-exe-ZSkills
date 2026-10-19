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
exports.InvitationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let InvitationsService = class InvitationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(teacherId, courseId, dto) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
        if (expiresAt && expiresAt.getTime() <= Date.now()) {
            throw new common_1.BadRequestException('Invitation expiration must be in the future');
        }
        return this.prisma.courseInvitation.create({
            data: {
                courseId,
                createdById: teacherId,
                token: (0, crypto_1.randomBytes)(16).toString('hex'),
                expiresAt,
                maxUses: dto.maxUses,
            },
        });
    }
    async listForCourse(teacherId, courseId) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        return this.prisma.courseInvitation.findMany({
            where: { courseId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deactivate(teacherId, invitationId) {
        const invitation = await this.prisma.courseInvitation.findUnique({
            where: { id: invitationId },
            include: { course: { select: { teacherId: true } } },
        });
        if (!invitation) {
            throw new common_1.NotFoundException('Invitation not found');
        }
        if (invitation.course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can manage only your own invitations');
        }
        return this.prisma.courseInvitation.update({
            where: { id: invitationId },
            data: { isActive: false },
        });
    }
    async redeem(studentId, token) {
        const invitation = await this.prisma.courseInvitation.findUnique({
            where: { token },
            include: {
                course: { select: { id: true } },
            },
        });
        if (!invitation) {
            throw new common_1.NotFoundException('Invitation not found');
        }
        if (!invitation.isActive) {
            throw new common_1.BadRequestException('Invitation is inactive');
        }
        if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Invitation has expired');
        }
        if (invitation.maxUses !== null &&
            invitation.maxUses !== undefined &&
            invitation.usesCount >= invitation.maxUses) {
            throw new common_1.BadRequestException('Invitation usage limit reached');
        }
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.enrollment.findUnique({
                where: {
                    courseId_studentId: {
                        courseId: invitation.courseId,
                        studentId,
                    },
                },
            });
            if (existing?.status === client_1.EnrollmentStatus.ACTIVE) {
                return existing;
            }
            const enrollment = existing
                ? await tx.enrollment.update({
                    where: { id: existing.id },
                    data: {
                        status: client_1.EnrollmentStatus.ACTIVE,
                        invitationId: invitation.id,
                        enrolledAt: new Date(),
                        removedAt: null,
                        removedById: null,
                    },
                })
                : await tx.enrollment.create({
                    data: {
                        courseId: invitation.courseId,
                        studentId,
                        invitationId: invitation.id,
                        status: client_1.EnrollmentStatus.ACTIVE,
                    },
                });
            await tx.courseInvitation.update({
                where: { id: invitation.id },
                data: {
                    usesCount: { increment: 1 },
                },
            });
            return enrollment;
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
            throw new common_1.ForbiddenException('You can manage invitations only for your own courses');
        }
    }
};
exports.InvitationsService = InvitationsService;
exports.InvitationsService = InvitationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvitationsService);
//# sourceMappingURL=invitations.service.js.map