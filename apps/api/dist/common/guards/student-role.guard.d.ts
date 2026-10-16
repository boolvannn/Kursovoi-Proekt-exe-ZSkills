import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class StudentRoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
