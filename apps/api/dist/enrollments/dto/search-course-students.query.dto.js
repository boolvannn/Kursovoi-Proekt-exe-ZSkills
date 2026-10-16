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
exports.SearchCourseStudentsQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
function normalizeFilter(value) {
    if (typeof value !== 'string') {
        return value;
    }
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length > 0 ? normalized : undefined;
}
class SearchCourseStudentsQueryDto {
}
exports.SearchCourseStudentsQueryDto = SearchCourseStudentsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => normalizeFilter(value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], SearchCourseStudentsQueryDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => normalizeFilter(value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], SearchCourseStudentsQueryDto.prototype, "group", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value === undefined ? value : Number(value))),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SearchCourseStudentsQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=search-course-students.query.dto.js.map