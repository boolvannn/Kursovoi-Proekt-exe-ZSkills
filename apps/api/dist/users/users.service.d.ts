import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCurrentProfile(userId: string): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findMany(role?: UserRole): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findById(id: string): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listTeachers(): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    listStudents(): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createTeacher(dto: CreateTeacherDto): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createStudent(dto: CreateStudentDto): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private createUserWithRole;
    updateStudent(id: string, dto: UpdateStudentDto): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateTeacher(id: string, dto: UpdateTeacherDto): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeStudent(id: string): Promise<{
        success: boolean;
    }>;
    removeTeacher(id: string): Promise<{
        success: boolean;
    }>;
}
