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
exports.TestsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const student_role_guard_1 = require("../common/guards/student-role.guard");
const teacher_role_guard_1 = require("../common/guards/teacher-role.guard");
const submit_test_attempt_dto_1 = require("./dto/submit-test-attempt.dto");
const upsert_test_content_dto_1 = require("./dto/upsert-test-content.dto");
const tests_service_1 = require("./tests.service");
let TestsController = class TestsController {
    constructor(testsService) {
        this.testsService = testsService;
    }
    lessonContentForTeacher(user, lessonId) {
        return this.testsService.getLessonTestContentForTeacher(user.userId, lessonId);
    }
    upsertLessonContentForTeacher(user, lessonId, dto) {
        return this.testsService.upsertLessonTestContentForTeacher(user.userId, lessonId, dto);
    }
    studentLessonForPassing(user, lessonId) {
        return this.testsService.getStudentTestForPassing(user.userId, lessonId);
    }
    startAttempt(user, lessonId) {
        return this.testsService.startAttempt(user.userId, lessonId);
    }
    submitAttempt(user, attemptId, dto) {
        return this.testsService.submitAttempt(user.userId, attemptId, dto);
    }
    myAttempts(user, lessonId) {
        return this.testsService.listMyAttempts(user.userId, lessonId);
    }
    attemptResult(user, attemptId) {
        return this.testsService.getAttemptResult(user.userId, attemptId);
    }
    lessonAttempts(user, lessonId) {
        return this.testsService.listLessonAttemptsForTeacher(user.userId, lessonId);
    }
};
exports.TestsController = TestsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)('lessons/:lessonId/content'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "lessonContentForTeacher", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Put)('lessons/:lessonId/content'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_test_content_dto_1.UpsertTestContentDto]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "upsertLessonContentForTeacher", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, student_role_guard_1.StudentRoleGuard),
    (0, common_1.Get)('student/lessons/:lessonId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "studentLessonForPassing", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, student_role_guard_1.StudentRoleGuard),
    (0, common_1.Post)('lessons/:lessonId/attempts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "startAttempt", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, student_role_guard_1.StudentRoleGuard),
    (0, common_1.Post)('attempts/:attemptId/submit'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('attemptId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, submit_test_attempt_dto_1.SubmitTestAttemptDto]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "submitAttempt", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, student_role_guard_1.StudentRoleGuard),
    (0, common_1.Get)('lessons/:lessonId/attempts/my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "myAttempts", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, student_role_guard_1.StudentRoleGuard),
    (0, common_1.Get)('attempts/:attemptId/result'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('attemptId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "attemptResult", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)('lessons/:lessonId/attempts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('lessonId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TestsController.prototype, "lessonAttempts", null);
exports.TestsController = TestsController = __decorate([
    (0, common_1.Controller)('tests'),
    __metadata("design:paramtypes", [tests_service_1.TestsService])
], TestsController);
//# sourceMappingURL=tests.controller.js.map