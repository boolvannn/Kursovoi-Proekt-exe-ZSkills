import { AuthUser } from '../common/types/auth-user.type';
export declare class DemoProtectedController {
    anyAuthenticated(user: AuthUser): {
        message: string;
        user: AuthUser;
    };
    studentOnly(user: AuthUser): {
        message: string;
        user: AuthUser;
    };
    teacherOnly(user: AuthUser): {
        message: string;
        user: AuthUser;
    };
    studentOnlyDirect(user: AuthUser): {
        message: string;
        user: AuthUser;
    };
    teacherOnlyDirect(user: AuthUser): {
        message: string;
        user: AuthUser;
    };
}
