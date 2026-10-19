"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentImportService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const class_validator_1 = require("class-validator");
const crypto_1 = require("crypto");
const XLSX = __importStar(require("xlsx"));
const prisma_service_1 = require("../prisma/prisma.service");
const HEADER_FULL_NAME = 'ФИО';
const HEADER_EMAIL = 'email';
const HEADER_GROUP = 'группа';
const HEADER_PASSWORD = 'пароль';
const SHEET_NAME = 'Студенты';
const CSV_REQUIRED_HEADERS = [HEADER_FULL_NAME, HEADER_EMAIL, HEADER_GROUP];
const MAX_CREDENTIAL_FILE_AGE_MS = 1000 * 60 * 30;
const publicUserSelect = {
    id: true,
    email: true,
    fullName: true,
    group: true,
    role: true,
    createdAt: true,
    updatedAt: true,
};
let StudentImportService = class StudentImportService {
    constructor(prisma) {
        this.prisma = prisma;
        this.credentialsFiles = new Map();
    }
    async preview(buffer) {
        const parsed = await this.parseAndValidate(buffer);
        return this.toPreview(parsed);
    }
    async importStudents(buffer, options) {
        const parsed = await this.parseAndValidate(buffer);
        const preview = this.toPreview(parsed);
        if (preview.hasErrors) {
            throw new common_1.BadRequestException({
                message: 'Импорт невозможен: исправьте ошибки в CSV-файле.',
                rows: preview.rows.filter((row) => !row.isValid).slice(0, 50),
            });
        }
        if (parsed.validRows.length === 0) {
            throw new common_1.BadRequestException('CSV-файл не содержит строк для импорта.');
        }
        const preparedRows = await Promise.all(parsed.validRows.map(async (row) => {
            const password = this.generatePassword();
            const passwordHash = await bcrypt.hash(password, 10);
            return {
                ...row,
                password,
                passwordHash,
            };
        }));
        let transactionResult;
        try {
            transactionResult = await this.prisma.$transaction(async (tx) => {
                const createdStudents = [];
                for (const row of preparedRows) {
                    const user = await tx.user.create({
                        data: {
                            email: row.email,
                            passwordHash: row.passwordHash,
                            fullName: row.fullName,
                            group: row.group,
                            role: client_1.UserRole.STUDENT,
                        },
                        select: publicUserSelect,
                    });
                    createdStudents.push({
                        user,
                        password: row.password,
                    });
                }
                let enrolledCount = 0;
                if (options.enrollToCourse && options.courseId && createdStudents.length > 0) {
                    const result = await tx.enrollment.createMany({
                        data: createdStudents.map((student) => ({
                            courseId: options.courseId,
                            studentId: student.user.id,
                            status: client_1.EnrollmentStatus.ACTIVE,
                        })),
                        skipDuplicates: true,
                    });
                    enrolledCount = result.count;
                }
                return {
                    createdStudents,
                    enrolledCount,
                };
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new common_1.BadRequestException('Некоторые email уже существуют в системе. Обновите CSV и попробуйте снова.');
            }
            throw error;
        }
        const workbookBuffer = this.buildCredentialsWorkbook(transactionResult.createdStudents.map((item) => ({
            fullName: item.user.fullName,
            email: item.user.email,
            password: item.password,
        })));
        const fileName = this.buildWorkbookFileName();
        const downloadId = this.storeCredentialsFile({
            ownerUserId: options.importedById,
            fileName,
            content: workbookBuffer,
        });
        return {
            summary: {
                totalRows: parsed.rows.length,
                createdCount: transactionResult.createdStudents.length,
                skippedCount: 0,
                failedCount: 0,
                enrolledCount: transactionResult.enrolledCount,
            },
            downloadId,
            downloadFileName: fileName,
        };
    }
    getCredentialsFile(downloadId, currentUserId) {
        this.cleanupExpiredFiles();
        const file = this.credentialsFiles.get(downloadId);
        if (!file) {
            throw new common_1.NotFoundException('Файл с результатами импорта не найден или уже недоступен.');
        }
        if (file.ownerUserId !== currentUserId) {
            throw new common_1.ForbiddenException('Нет доступа к этому файлу результатов.');
        }
        return {
            fileName: file.fileName,
            content: file.content,
        };
    }
    async parseAndValidate(buffer) {
        const csvText = this.decodeCsvBuffer(buffer);
        const rawLines = csvText.split(/\r?\n/);
        while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim().length === 0) {
            rawLines.pop();
        }
        const headerLineIndex = rawLines.findIndex((line) => line.trim().length > 0);
        if (headerLineIndex === -1) {
            throw new common_1.BadRequestException('CSV-файл пуст.');
        }
        const headerLine = rawLines[headerLineIndex];
        const delimiter = this.detectDelimiter(headerLine);
        const headers = this.parseCsvLine(headerLine, delimiter).map((value) => value.trim().replace(/^\uFEFF/, ''));
        const headerIndexMap = new Map();
        headers.forEach((header, index) => {
            headerIndexMap.set(this.normalizeHeader(header), index);
        });
        const fullNameIndex = headerIndexMap.get(this.normalizeHeader(HEADER_FULL_NAME));
        const emailIndex = headerIndexMap.get(this.normalizeHeader(HEADER_EMAIL));
        const groupIndex = headerIndexMap.get(this.normalizeHeader(HEADER_GROUP));
        const missingHeaders = [];
        if (fullNameIndex === undefined)
            missingHeaders.push(HEADER_FULL_NAME);
        if (emailIndex === undefined)
            missingHeaders.push(HEADER_EMAIL);
        if (groupIndex === undefined)
            missingHeaders.push(HEADER_GROUP);
        if (missingHeaders.length > 0) {
            throw new common_1.BadRequestException(`В CSV отсутствуют обязательные колонки: ${missingHeaders.join(', ')}`);
        }
        const resolvedFullNameIndex = fullNameIndex;
        const resolvedEmailIndex = emailIndex;
        const resolvedGroupIndex = groupIndex;
        const rows = [];
        for (let lineIndex = headerLineIndex + 1; lineIndex < rawLines.length; lineIndex += 1) {
            const line = rawLines[lineIndex];
            if (line.trim().length === 0) {
                continue;
            }
            const cells = this.parseCsvLine(line, delimiter);
            const fullNameRaw = cells[resolvedFullNameIndex] ?? '';
            const emailRaw = cells[resolvedEmailIndex] ?? '';
            const groupRaw = cells[resolvedGroupIndex] ?? '';
            const fullName = this.normalizeTextField(fullNameRaw);
            const email = emailRaw.trim().toLowerCase();
            const group = this.normalizeTextField(groupRaw);
            const errors = [];
            if (!fullName) {
                errors.push('Поле «ФИО» обязательно.');
            }
            if (!email) {
                errors.push('Поле «email» обязательно.');
            }
            else if (!(0, class_validator_1.isEmail)(email)) {
                errors.push('Некорректный email.');
            }
            if (!group) {
                errors.push('Поле «группа» обязательно.');
            }
            rows.push({
                rowNumber: lineIndex + 1,
                fullName,
                email,
                group,
                errors,
            });
        }
        if (rows.length === 0) {
            throw new common_1.BadRequestException('CSV-файл не содержит данных для импорта.');
        }
        const emailOccurrences = new Map();
        for (const row of rows) {
            if (row.email && (0, class_validator_1.isEmail)(row.email)) {
                emailOccurrences.set(row.email, (emailOccurrences.get(row.email) ?? 0) + 1);
            }
        }
        for (const row of rows) {
            if (row.email && (0, class_validator_1.isEmail)(row.email) && (emailOccurrences.get(row.email) ?? 0) > 1) {
                row.errors.push('Дублирующийся email внутри CSV-файла.');
            }
        }
        const candidateEmails = Array.from(new Set(rows.filter((row) => row.email && (0, class_validator_1.isEmail)(row.email)).map((row) => row.email)));
        if (candidateEmails.length > 0) {
            const existingUsers = await this.prisma.user.findMany({
                where: {
                    email: {
                        in: candidateEmails,
                    },
                },
                select: { email: true },
            });
            const existingEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));
            for (const row of rows) {
                if (row.email && existingEmails.has(row.email)) {
                    row.errors.push('Пользователь с таким email уже существует.');
                }
            }
        }
        const validRows = rows
            .filter((row) => row.errors.length === 0)
            .map((row) => ({
            rowNumber: row.rowNumber,
            fullName: row.fullName,
            email: row.email,
            group: row.group,
        }));
        return {
            headers,
            rows,
            validRows,
        };
    }
    toPreview(parsed) {
        const previewRows = parsed.rows.map((row) => {
            const errors = Array.from(new Set(row.errors));
            return {
                rowNumber: row.rowNumber,
                fullName: row.fullName,
                email: row.email,
                group: row.group,
                isValid: errors.length === 0,
                errors,
            };
        });
        const invalidRows = previewRows.filter((row) => !row.isValid).length;
        return {
            headers: parsed.headers,
            requiredHeaders: CSV_REQUIRED_HEADERS,
            totalRows: previewRows.length,
            validRows: previewRows.length - invalidRows,
            invalidRows,
            hasErrors: invalidRows > 0,
            rows: previewRows,
        };
    }
    normalizeHeader(value) {
        return value.trim().replace(/\s+/g, ' ').toLowerCase();
    }
    normalizeTextField(value) {
        return value.trim().replace(/\s+/g, ' ');
    }
    detectDelimiter(headerLine) {
        const semicolonCount = (headerLine.match(/;/g) ?? []).length;
        const commaCount = (headerLine.match(/,/g) ?? []).length;
        return semicolonCount > commaCount ? ';' : ',';
    }
    parseCsvLine(line, delimiter) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                }
                else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (char === delimiter && !inQuotes) {
                fields.push(current);
                current = '';
                continue;
            }
            current += char;
        }
        fields.push(current);
        return fields;
    }
    decodeCsvBuffer(buffer) {
        const text = buffer.toString('utf-8');
        return text.replace(/^\uFEFF/, '');
    }
    buildCredentialsWorkbook(rows) {
        const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
            [HEADER_FULL_NAME]: row.fullName,
            [HEADER_EMAIL]: row.email,
            [HEADER_PASSWORD]: row.password,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
        return XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx',
        });
    }
    buildWorkbookFileName() {
        const now = new Date();
        const stamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            '-',
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0'),
        ].join('');
        return `students-import-${stamp}.xlsx`;
    }
    storeCredentialsFile(file) {
        this.cleanupExpiredFiles();
        const downloadId = (0, crypto_1.randomUUID)();
        this.credentialsFiles.set(downloadId, {
            ...file,
            createdAt: Date.now(),
        });
        return downloadId;
    }
    cleanupExpiredFiles() {
        const now = Date.now();
        for (const [key, file] of this.credentialsFiles.entries()) {
            if (now - file.createdAt > MAX_CREDENTIAL_FILE_AGE_MS) {
                this.credentialsFiles.delete(key);
            }
        }
    }
    generatePassword(length = 10) {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        let result = '';
        for (let i = 0; i < length; i += 1) {
            const index = (0, crypto_1.randomInt)(0, alphabet.length);
            result += alphabet[index];
        }
        return result;
    }
};
exports.StudentImportService = StudentImportService;
exports.StudentImportService = StudentImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentImportService);
//# sourceMappingURL=student-import.service.js.map