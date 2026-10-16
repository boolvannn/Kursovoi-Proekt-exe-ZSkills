import { AuthUser } from '../common/types/auth-user.type';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RedeemInvitationDto } from './dto/redeem-invitation.dto';
import { InvitationsService } from './invitations.service';
export declare class InvitationsController {
    private readonly invitationsService;
    constructor(invitationsService: InvitationsService);
    create(user: AuthUser, courseId: string, dto: CreateInvitationDto): Promise<{
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
    list(user: AuthUser, courseId: string): Promise<{
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
    deactivate(user: AuthUser, invitationId: string): Promise<{
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
    accept(user: AuthUser, dto: RedeemInvitationDto): Promise<{
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
    redeem(user: AuthUser, dto: RedeemInvitationDto): Promise<{
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
}
