"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherRoleGuard = void 0;
const common_1 = require("@nestjs/common");
const user_role_enum_1 = require("../enums/user-role.enum");
let TeacherRoleGuard = class TeacherRoleGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication is required');
        }
        if (user.role !== user_role_enum_1.UserRole.TEACHER) {
            throw new common_1.ForbiddenException('Teacher role is required');
        }
        return true;
    }
};
exports.TeacherRoleGuard = TeacherRoleGuard;
exports.TeacherRoleGuard = TeacherRoleGuard = __decorate([
    (0, common_1.Injectable)()
], TeacherRoleGuard);
//# sourceMappingURL=teacher-role.guard.js.map