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
exports.SubmitTestAttemptDto = exports.SubmitQuestionAnswerDto = exports.SubmitMatchingPairDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class SubmitMatchingPairDto {
}
exports.SubmitMatchingPairDto = SubmitMatchingPairDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubmitMatchingPairDto.prototype, "leftId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubmitMatchingPairDto.prototype, "rightId", void 0);
class SubmitQuestionAnswerDto {
}
exports.SubmitQuestionAnswerDto = SubmitQuestionAnswerDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubmitQuestionAnswerDto.prototype, "questionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], SubmitQuestionAnswerDto.prototype, "optionIds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitQuestionAnswerDto.prototype, "textAnswer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SubmitMatchingPairDto),
    __metadata("design:type", Array)
], SubmitQuestionAnswerDto.prototype, "matchingPairs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], SubmitQuestionAnswerDto.prototype, "orderingItemIds", void 0);
class SubmitTestAttemptDto {
}
exports.SubmitTestAttemptDto = SubmitTestAttemptDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SubmitQuestionAnswerDto),
    __metadata("design:type", Array)
], SubmitTestAttemptDto.prototype, "answers", void 0);
//# sourceMappingURL=submit-test-attempt.dto.js.map