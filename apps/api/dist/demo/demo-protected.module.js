"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoProtectedModule = void 0;
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("../common/guards/roles.guard");
const student_role_guard_1 = require("../common/guards/student-role.guard");
const teacher_role_guard_1 = require("../common/guards/teacher-role.guard");
const demo_protected_controller_1 = require("./demo-protected.controller");
let DemoProtectedModule = class DemoProtectedModule {
};
exports.DemoProtectedModule = DemoProtectedModule;
exports.DemoProtectedModule = DemoProtectedModule = __decorate([
    (0, common_1.Module)({
        controllers: [demo_protected_controller_1.DemoProtectedController],
        providers: [roles_guard_1.RolesGuard, student_role_guard_1.StudentRoleGuard, teacher_role_guard_1.TeacherRoleGuard],
    })
], DemoProtectedModule);
//# sourceMappingURL=demo-protected.module.js.map