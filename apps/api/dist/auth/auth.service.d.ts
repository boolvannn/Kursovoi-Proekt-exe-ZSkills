import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
type PublicUser = {
    id: string;
    email: string;
    fullName: string;
    group: string | null;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
};
type AuthResult = {
    accessToken: string;
    user: PublicUser;
};
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<AuthResult>;
    login(dto: LoginDto): Promise<AuthResult>;
    getCurrentUserProfile(userId: string): Promise<PublicUser>;
    private buildAuthResult;
    private toPublicUser;
}
export {};
