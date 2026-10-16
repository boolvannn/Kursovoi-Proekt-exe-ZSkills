import { AuthUser } from '../common/types/auth-user.type';
import { CreateModuleDto } from './dto/create-module.dto';
import { ReorderModulesDto } from './dto/reorder-modules.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModulesService } from './modules.service';
export declare class ModulesController {
    private readonly modulesService;
    constructor(modulesService: ModulesService);
    listByCourse(user: AuthUser, courseId: string): Promise<({
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
    create(user: AuthUser, dto: CreateModuleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        description: string | null;
        courseId: string;
    } | null>;
    reorder(user: AuthUser, dto: ReorderModulesDto): Promise<({
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
    update(user: AuthUser, moduleId: string, dto: UpdateModuleDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        orderIndex: number;
        description: string | null;
        courseId: string;
    } | null>;
    remove(user: AuthUser, moduleId: string): Promise<{
        success: boolean;
    }>;
}
