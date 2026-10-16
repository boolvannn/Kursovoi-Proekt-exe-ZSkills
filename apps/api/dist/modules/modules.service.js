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
exports.ModulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ModulesService = class ModulesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listByCourse(teacherId, courseId) {
        await this.assertTeacherOwnsCourse(teacherId, courseId);
        return this.prisma.courseModule.findMany({
            where: { courseId },
            orderBy: { orderIndex: 'asc' },
            include: {
                lessons: {
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });
    }
    async create(teacherId, dto) {
        await this.assertTeacherOwnsCourse(teacherId, dto.courseId);
        const existing = await this.prisma.courseModule.findMany({
            where: { courseId: dto.courseId },
            orderBy: { orderIndex: 'asc' },
            select: { id: true },
        });
        const nextOrderIndex = existing.length + 1;
        const targetOrderIndex = dto.orderIndex
            ? Math.max(1, Math.min(dto.orderIndex, nextOrderIndex))
            : nextOrderIndex;
        return this.prisma.$transaction(async (tx) => {
            const created = await tx.courseModule.create({
                data: {
                    courseId: dto.courseId,
                    title: dto.title,
                    description: dto.description,
                    orderIndex: nextOrderIndex,
                },
            });
            if (targetOrderIndex !== nextOrderIndex) {
                const reorderedIds = [...existing.map((item) => item.id)];
                reorderedIds.splice(targetOrderIndex - 1, 0, created.id);
                await this.applyOrderIndexes(tx, dto.courseId, reorderedIds);
            }
            return tx.courseModule.findUnique({
                where: { id: created.id },
            });
        });
    }
    async update(teacherId, moduleId, dto) {
        const module = await this.getOwnedModule(teacherId, moduleId);
        if (dto.orderIndex === undefined) {
            return this.prisma.courseModule.update({
                where: { id: moduleId },
                data: {
                    title: dto.title,
                    description: dto.description,
                },
            });
        }
        return this.prisma.$transaction(async (tx) => {
            const modules = await tx.courseModule.findMany({
                where: { courseId: module.courseId },
                orderBy: { orderIndex: 'asc' },
                select: { id: true },
            });
            const currentIndex = modules.findIndex((item) => item.id === moduleId);
            if (currentIndex === -1) {
                throw new common_1.NotFoundException('Module not found in course');
            }
            const boundedTarget = Math.max(1, Math.min(dto.orderIndex ?? 1, modules.length));
            const reorderedIds = modules
                .map((item) => item.id)
                .filter((id) => id !== moduleId);
            reorderedIds.splice(boundedTarget - 1, 0, moduleId);
            await this.applyOrderIndexes(tx, module.courseId, reorderedIds);
            await tx.courseModule.update({
                where: { id: moduleId },
                data: {
                    title: dto.title,
                    description: dto.description,
                },
            });
            return tx.courseModule.findUnique({
                where: { id: moduleId },
            });
        });
    }
    async reorder(teacherId, dto) {
        await this.assertTeacherOwnsCourse(teacherId, dto.courseId);
        const modules = await this.prisma.courseModule.findMany({
            where: { courseId: dto.courseId },
            select: { id: true },
            orderBy: { orderIndex: 'asc' },
        });
        if (modules.length !== dto.items.length) {
            throw new common_1.BadRequestException('Reorder payload must include all modules of the course');
        }
        const moduleIds = modules.map((item) => item.id);
        const payloadIds = dto.items.map((item) => item.moduleId);
        const hasDuplicates = new Set(payloadIds).size !== payloadIds.length;
        if (hasDuplicates) {
            throw new common_1.BadRequestException('Reorder payload contains duplicate module IDs');
        }
        const orderIndexes = dto.items.map((item) => item.orderIndex);
        const hasDuplicateOrderIndexes = new Set(orderIndexes).size !== orderIndexes.length;
        if (hasDuplicateOrderIndexes) {
            throw new common_1.BadRequestException('Reorder payload contains duplicate order indexes');
        }
        const allBelongToCourse = payloadIds.every((id) => moduleIds.includes(id));
        if (!allBelongToCourse) {
            throw new common_1.BadRequestException('Reorder payload contains foreign module IDs');
        }
        const sortedItems = [...dto.items].sort((a, b) => a.orderIndex - b.orderIndex);
        const orderedIds = sortedItems.map((item) => item.moduleId);
        await this.prisma.$transaction(async (tx) => {
            await this.applyOrderIndexes(tx, dto.courseId, orderedIds);
        });
        return this.prisma.courseModule.findMany({
            where: { courseId: dto.courseId },
            orderBy: { orderIndex: 'asc' },
            include: {
                lessons: {
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });
    }
    async remove(teacherId, moduleId) {
        const module = await this.getOwnedModule(teacherId, moduleId);
        await this.prisma.$transaction(async (tx) => {
            await tx.courseModule.delete({
                where: { id: moduleId },
            });
            const remaining = await tx.courseModule.findMany({
                where: { courseId: module.courseId },
                orderBy: { orderIndex: 'asc' },
                select: { id: true },
            });
            await this.applyOrderIndexes(tx, module.courseId, remaining.map((item) => item.id));
        });
        return { success: true };
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
            throw new common_1.ForbiddenException('You can manage only your own courses');
        }
    }
    async getOwnedModule(teacherId, moduleId) {
        const module = await this.prisma.courseModule.findUnique({
            where: { id: moduleId },
            include: {
                course: {
                    select: {
                        id: true,
                        teacherId: true,
                    },
                },
            },
        });
        if (!module) {
            throw new common_1.NotFoundException('Module not found');
        }
        if (module.course.teacherId !== teacherId) {
            throw new common_1.ForbiddenException('You can manage only your own course modules');
        }
        return {
            id: module.id,
            courseId: module.course.id,
        };
    }
    async applyOrderIndexes(tx, courseId, orderedModuleIds) {
        for (let i = 0; i < orderedModuleIds.length; i += 1) {
            await tx.courseModule.update({
                where: { id: orderedModuleIds[i] },
                data: { orderIndex: 10_000 + i },
            });
        }
        for (let i = 0; i < orderedModuleIds.length; i += 1) {
            await tx.courseModule.update({
                where: { id: orderedModuleIds[i] },
                data: { orderIndex: i + 1 },
            });
        }
        const normalized = await tx.courseModule.findMany({
            where: { courseId },
            orderBy: { orderIndex: 'asc' },
            select: { id: true },
        });
        if (normalized.length !== orderedModuleIds.length) {
            throw new common_1.BadRequestException('Failed to apply order indexes consistently');
        }
    }
};
exports.ModulesService = ModulesService;
exports.ModulesService = ModulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ModulesService);
//# sourceMappingURL=modules.service.js.map