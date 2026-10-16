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
exports.EnrollmentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const student_role_guard_1 = require("../common/guards/student-role.guard");
const teacher_role_guard_1 = require("../common/guards/teacher-role.guard");
const import_students_dto_1 = require("../users/dto/import-students.dto");
const create_course_student_dto_1 = require("./dto/create-course-student.dto");
const search_course_students_query_dto_1 = require("./dto/search-course-students.query.dto");
const enrollments_service_1 = require("./enrollments.service");
const csvFilePipe = new common_1.ParseFilePipeBuilder()
    .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 })
    .build({ fileIsRequired: true });
let EnrollmentsController = class EnrollmentsController {
    constructor(enrollmentsService) {
        this.enrollmentsService = enrollmentsService;
    }
    my(user) {
        return this.enrollmentsService.listMyEnrollments(user.userId);
    }
    byCourse(user, courseId) {
        return this.enrollmentsService.listCourseEnrollments(user.userId, courseId);
    }
    searchStudentsForCourse(user, courseId, query) {
        return this.enrollmentsService.searchStudentsForCourse(user.userId, courseId, query);
    }
    createStudentForCourse(user, courseId, dto) {
        return this.enrollmentsService.createStudentForCourse(user.userId, courseId, dto);
    }
    previewCourseStudentsImport(user, courseId, file) {
        return this.enrollmentsService.previewCourseStudentImport(user.userId, courseId, file.buffer);
    }
    importCourseStudents(user, courseId, file, dto) {
        return this.enrollmentsService.importStudentsForCourse(user.userId, courseId, file.buffer, dto.enrollToCourse ?? false);
    }
    enrollExistingStudentForCourse(user, courseId, studentId) {
        return this.enrollmentsService.enrollExistingStudentForCourse(user.userId, courseId, studentId);
    }
    remove(user, enrollmentId) {
        return this.enrollmentsService.removeStudentFromCourse(user.userId, enrollmentId);
    }
};
exports.EnrollmentsController = EnrollmentsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, student_role_guard_1.StudentRoleGuard),
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "my", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)('course/:courseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "byCourse", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)('course/:courseId/students/search'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, search_course_students_query_dto_1.SearchCourseStudentsQueryDto]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "searchStudentsForCourse", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Post)('course/:courseId/students'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_course_student_dto_1.CreateCourseStudentDto]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "createStudentForCourse", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Post)('course/:courseId/students/import/preview'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.UploadedFile)(csvFilePipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "previewCourseStudentsImport", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Post)('course/:courseId/students/import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.UploadedFile)(csvFilePipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, import_students_dto_1.ImportStudentsDto]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "importCourseStudents", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Post)('course/:courseId/students/:studentId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('studentId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "enrollExistingStudentForCourse", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Delete)(':enrollmentId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('enrollmentId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EnrollmentsController.prototype, "remove", null);
exports.EnrollmentsController = EnrollmentsController = __decorate([
    (0, common_1.Controller)('enrollments'),
    __metadata("design:paramtypes", [enrollments_service_1.EnrollmentsService])
], EnrollmentsController);
//# sourceMappingURL=enrollments.controller.js.map