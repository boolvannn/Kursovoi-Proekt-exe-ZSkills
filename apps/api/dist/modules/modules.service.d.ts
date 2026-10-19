import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { ReorderModulesDto } from './dto/reorder-modules.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
export declare class ModulesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listByCourse(teacherId: string, courseId: string): Promise<({
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
    })[]>;
    create(teacherId: string, dto: CreateModuleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        description: string | null;
        courseId: string;
    } | null>;
    update(teacherId: string, moduleId: string, dto: UpdateModuleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        description: string | null;
        courseId: string;
    } | null>;
    reorder(teacherId: string, dto: ReorderModulesDto): Promise<({
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
    })[]>;
    remove(teacherId: string, moduleId: string): Promise<{
        success: boolean;
    }>;
    private assertTeacherOwnsCourse;
    private getOwnedModule;
    private applyOrderIndexes;
}
