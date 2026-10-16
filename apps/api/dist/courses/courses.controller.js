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
exports.CoursesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const student_role_guard_1 = require("../common/guards/student-role.guard");
const teacher_role_guard_1 = require("../common/guards/teacher-role.guard");
const create_course_dto_1 = require("./dto/create-course.dto");
const list_public_courses_query_dto_1 = require("./dto/list-public-courses.query.dto");
const update_course_dto_1 = require("./dto/update-course.dto");
const courses_service_1 = require("./courses.service");
let CoursesController = class CoursesController {
    constructor(coursesService) {
        this.coursesService = coursesService;
    }
    listPublic(query) {
        return this.coursesService.listPublic(query.page, query.limit);
    }
    publicById(courseId) {
        return this.coursesService.getPublicById(courseId);
    }
    myCourses(user) {
        return this.coursesService.listTeacherCourses(user.userId);
    }
    studentCourseById(user, courseId) {
        return this.coursesService.getStudentCourseById(user.userId, courseId);
    }
    myCourseById(user, courseId) {
        return this.coursesService.getTeacherCourseById(user.userId, courseId);
    }
    create(user, dto) {
        return this.coursesService.create(user.userId, dto);
    }
    update(user, courseId, dto) {
        return this.coursesService.update(user.userId, courseId, dto);
    }
    remove(user, courseId) {
        return this.coursesService.remove(user.userId, courseId);
    }
};
exports.CoursesController = CoursesController;
__decorate([
    (0, common_1.Get)('public'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_public_courses_query_dto_1.ListPublicCoursesQueryDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "listPublic", null);
__decorate([
    (0, common_1.Get)('public/:courseId'),
    __param(0, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "publicById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)('my'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "myCourses", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, student_role_guard_1.StudentRoleGuard),
    (0, common_1.Get)('student/:courseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "studentCourseById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Get)('my/:courseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "myCourseById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_course_dto_1.CreateCourseDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Patch)('my/:courseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_course_dto_1.UpdateCourseDto]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, teacher_role_guard_1.TeacherRoleGuard),
    (0, common_1.Delete)('my/:courseId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('courseId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CoursesController.prototype, "remove", null);
exports.CoursesController = CoursesController = __decorate([
    (0, common_1.Controller)('courses'),
    __metadata("design:paramtypes", [courses_service_1.CoursesService])
], CoursesController);
//# sourceMappingURL=courses.controller.js.map