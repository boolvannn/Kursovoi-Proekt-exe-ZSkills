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
exports.LecturesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const roles_guard_1 = require("../common/guards/roles.guard");
const delete_lecture_file_dto_1 = require("./dto/delete-lecture-file.dto");
const lessons_service_1 = require("./lessons.service");
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
let LecturesController = class LecturesController {
    constructor(lessonsService) {
        this.lessonsService = lessonsService;
    }
    uploadLectureFiles(user, lessonId, files) {
        return this.lessonsService.uploadLectureFiles(user, lessonId, files ?? []);
    }
    deleteLectureFile(user, lessonId, dto) {
        return this.lessonsService.deleteLectureFile(user, lessonId, dto.fileUrl);
    }
};
exports.LecturesController = LecturesController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.TEACHER, user_role_enum_1.UserRole.ADMIN),
    (0, common_1.Post)(':id/files'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 6, {
        limits: {
            files: 6,
            fileSize: MAX_FILE_SIZE_BYTES,
        },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", void 0)
], LecturesController.prototype, "uploadLectureFiles", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.TEACHER, user_role_enum_1.UserRole.ADMIN),
    (0, common_1.Delete)(':id/files'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, delete_lecture_file_dto_1.DeleteLectureFileDto]),
    __metadata("design:returntype", void 0)
], LecturesController.prototype, "deleteLectureFile", null);
exports.LecturesController = LecturesController = __decorate([
    (0, common_1.Controller)('lectures'),
    __metadata("design:paramtypes", [lessons_service_1.LessonsService])
], LecturesController);
//# sourceMappingURL=lectures.controller.js.map