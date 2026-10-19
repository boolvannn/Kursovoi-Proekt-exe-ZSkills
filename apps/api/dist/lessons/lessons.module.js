"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonsModule = void 0;
const common_1 = require("@nestjs/common");
const tests_module_1 = require("../tests/tests.module");
const lectures_controller_1 = require("./lectures.controller");
const lessons_controller_1 = require("./lessons.controller");
const lessons_service_1 = require("./lessons.service");
let LessonsModule = class LessonsModule {
};
exports.LessonsModule = LessonsModule;
exports.LessonsModule = LessonsModule = __decorate([
    (0, common_1.Module)({
        imports: [tests_module_1.TestsModule],
        controllers: [lessons_controller_1.LessonsController, lectures_controller_1.LecturesController],
        providers: [lessons_service_1.LessonsService],
        exports: [lessons_service_1.LessonsService],
    })
], LessonsModule);
//# sourceMappingURL=lessons.module.js.map