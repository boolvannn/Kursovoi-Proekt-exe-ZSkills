"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoProtectedController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const roles_guard_1 = require("../common/guards/roles.guard");
const student_role_guard_1 = require("../common/guards/student-role.guard");
const teacher_role_guard_1 = require("../common/guards/teacher-role.guard");
let DemoProtectedController = class DemoProtectedController {
    anyAuthenticated(user) {
        return {
            message: 'Authenticated route',
            user,
        };
    }
    studentOnly(user) {
        return {
            message: 'Student route (RolesGuard)',
            user,
        };
    }
    teacherOnly(user) {
        return {
            message: 'Teacher route (RolesGuard)',
            user,
        };
    }
    studentOnlyDirect(user) {
        return {
            message: 'Student route (StudentRoleGuard)',
            user,
        };
    }
    teacherOnlyDirect(user) {
        return {
            message: 'Teacher route (TeacherRoleGuard)',
            user,
        };
    }
};
exports.DemoProtectedController = DemoProtectedController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('any-authenticated'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DemoProtectedController.prototype, "anyAuthenticated", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.STUDENT),
    (0, common_1.Get)('student-only'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DemoProtectedController.prototype, "studentOnly", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.TEACHER),
    (0, common_1.Get)('teacher-only'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DemoProtectedController.prototype, "teacherOnly", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, student_role_guard_1.StudentRoleGuard),
    (0, common_1.Get)('student-only-direct-guard'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DemoProtectedController.prototype, "studentOnlyDirect", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)('teacher-only-direct-guard'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DemoProtectedController.prototype, "teacherOnlyDirect", null);
exports.DemoProtectedController = DemoProtectedController = __decorate([
    (0, common_1.Controller)('protected')
], DemoProtectedController);
//# sourceMappingURL=demo-protected.controller.js.map