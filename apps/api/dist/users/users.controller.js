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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const admin_role_guard_1 = require("../common/guards/admin-role.guard");
const teacher_role_guard_1 = require("../common/guards/teacher-role.guard");
const create_student_dto_1 = require("./dto/create-student.dto");
const create_teacher_dto_1 = require("./dto/create-teacher.dto");
const import_students_dto_1 = require("./dto/import-students.dto");
const list_users_query_dto_1 = require("./dto/list-users.query.dto");
const update_student_dto_1 = require("./dto/update-student.dto");
const update_teacher_dto_1 = require("./dto/update-teacher.dto");
const student_import_service_1 = require("./student-import.service");
const users_service_1 = require("./users.service");
const csvFilePipe = new common_1.ParseFilePipeBuilder()
    .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 })
    .build({ fileIsRequired: true });
let UsersController = class UsersController {
    constructor(usersService, studentImportService) {
        this.usersService = usersService;
        this.studentImportService = studentImportService;
    }
    me(user) {
        return this.usersService.getCurrentProfile(user.userId);
    }
    list(query) {
        return this.usersService.findMany(query.role);
    }
    listTeachers() {
        return this.usersService.listTeachers();
    }
    listStudents() {
        return this.usersService.listStudents();
    }
    createTeacher(dto) {
        return this.usersService.createTeacher(dto);
    }
    createStudentByAdmin(dto) {
        return this.usersService.createStudent(dto);
    }
    previewStudentsImportByAdmin(file) {
        return this.studentImportService.preview(file.buffer);
    }
    importStudentsByAdmin(user, file, _) {
        return this.studentImportService.importStudents(file.buffer, {
            importedById: user.userId,
        });
    }
    downloadStudentsImportResult(user, downloadId, response) {
        const file = this.studentImportService.getCredentialsFile(downloadId, user.userId);
        response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
        return new common_1.StreamableFile(file.content);
    }
    updateTeacher(id, dto) {
        return this.usersService.updateTeacher(id, dto);
    }
    updateStudent(id, dto) {
        return this.usersService.updateStudent(id, dto);
    }
    removeTeacher(id) {
        return this.usersService.removeTeacher(id);
    }
    removeStudent(id) {
        return this.usersService.removeStudent(id);
    }
    byId(id) {
        return this.usersService.findById(id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_users_query_dto_1.ListUsersQueryDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Get)('admin/teachers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "listTeachers", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Get)('admin/students'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "listStudents", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Post)('admin/teachers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_teacher_dto_1.CreateTeacherDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "createTeacher", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Post)('admin/students'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_student_dto_1.CreateStudentDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "createStudentByAdmin", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Post)('admin/students/import/preview'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)(csvFilePipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "previewStudentsImportByAdmin", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Post)('admin/students/import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)(csvFilePipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, import_students_dto_1.ImportStudentsDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "importStudentsByAdmin", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('students/import/download/:downloadId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('downloadId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "downloadStudentsImportResult", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Patch)('admin/teachers/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_teacher_dto_1.UpdateTeacherDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateTeacher", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Patch)('admin/students/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_student_dto_1.UpdateStudentDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateStudent", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Delete)('admin/teachers/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "removeTeacher", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_role_guard_1.AdminRoleGuard),
    (0, common_1.Delete)('admin/students/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "removeStudent", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "byId", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        student_import_service_1.StudentImportService])
], UsersController);
//# sourceMappingURL=users.controller.js.map