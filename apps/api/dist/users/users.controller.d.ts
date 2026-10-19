import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { ImportStudentsDto } from './dto/import-students.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { StudentImportService } from './student-import.service';
import { UsersService } from './users.service';
type UploadedCsvFile = {
    buffer: Buffer;
};
export declare class UsersController {
    private readonly usersService;
    private readonly studentImportService;
    constructor(usersService: UsersService, studentImportService: StudentImportService);
    me(user: AuthUser): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    list(query: ListUsersQueryDto): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
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
    createStudentByAdmin(dto: CreateStudentDto): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    previewStudentsImportByAdmin(file: UploadedCsvFile): Promise<import("./student-import.service").StudentImportPreview>;
    importStudentsByAdmin(user: AuthUser, file: UploadedCsvFile, _: ImportStudentsDto): Promise<import("./student-import.service").StudentImportResult>;
    downloadStudentsImportResult(user: AuthUser, downloadId: string, response: Response): StreamableFile;
    updateTeacher(id: string, dto: UpdateTeacherDto): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateStudent(id: string, dto: UpdateStudentDto): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeTeacher(id: string): Promise<{
        success: boolean;
    }>;
    removeStudent(id: string): Promise<{
        success: boolean;
    }>;
    byId(id: string): Promise<{
        email: string;
        fullName: string;
        role: import(".prisma/client").$Enums.UserRole;
        id: string;
        group: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
