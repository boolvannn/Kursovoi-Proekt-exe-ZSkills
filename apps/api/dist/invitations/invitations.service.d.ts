import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
export declare class InvitationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(teacherId: string, courseId: string, dto: CreateInvitationDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        courseId: string;
        expiresAt: Date | null;
        maxUses: number | null;
        token: string;
        isActive: boolean;
        usesCount: number;
        createdById: string | null;
    }>;
    listForCourse(teacherId: string, courseId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        courseId: string;
        expiresAt: Date | null;
        maxUses: number | null;
        token: string;
        isActive: boolean;
        usesCount: number;
        createdById: string | null;
    }[]>;
    deactivate(teacherId: string, invitationId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        courseId: string;
        expiresAt: Date | null;
        maxUses: number | null;
        token: string;
        isActive: boolean;
        usesCount: number;
        createdById: string | null;
    }>;
    redeem(studentId: string, token: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EnrollmentStatus;
        courseId: string;
        studentId: string;
        invitationId: string | null;
        enrolledAt: Date;
        removedAt: Date | null;
        removedById: string | null;
    }>;
    private assertTeacherOwnsCourse;
}
