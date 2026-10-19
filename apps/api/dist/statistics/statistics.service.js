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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsService = void 0;
const common_1 = require("@nestjs/common");
const progress_service_1 = require("../progress/progress.service");
let StatisticsService = class StatisticsService {
    constructor(progressService) {
        this.progressService = progressService;
    }
    async getCourseStatistics(teacherId, courseId) {
        return this.progressService.getTeacherCourseProgressOverview(teacherId, courseId);
    }
    async listCourseStudentsStatistics(teacherId, courseId) {
        const overview = await this.progressService.getTeacherCourseProgressOverview(teacherId, courseId);
        return {
            course: overview.course,
            summary: overview.summary,
            tests: overview.tests,
            students: overview.students,
        };
    }
    async getStudentStatistics(teacherId, courseId, studentId) {
        return this.progressService.getTeacherStudentProgressByCourse(teacherId, courseId, studentId);
    }
};
exports.StatisticsService = StatisticsService;
exports.StatisticsService = StatisticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [progress_service_1.ProgressService])
], StatisticsService);
//# sourceMappingURL=statistics.service.js.map