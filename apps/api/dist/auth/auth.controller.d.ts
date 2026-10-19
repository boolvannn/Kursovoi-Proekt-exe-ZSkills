import { AuthUser } from '../common/types/auth-user.type';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            group: string | null;
            role: import(".prisma/client").UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            group: string | null;
            role: import(".prisma/client").UserRole;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    me(user: AuthUser): Promise<{
        id: string;
        email: string;
        fullName: string;
        group: string | null;
        role: import(".prisma/client").UserRole;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
