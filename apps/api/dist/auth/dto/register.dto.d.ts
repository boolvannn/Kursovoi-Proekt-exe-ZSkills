import { UserRole } from '../../common/enums/user-role.enum';
export declare class RegisterDto {
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
}
