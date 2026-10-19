import { PrismaService } from '../prisma/prisma.service';
export type StudentImportPreviewRow = {
    rowNumber: number;
    fullName: string;
    email: string;
    group: string;
    isValid: boolean;
    errors: string[];
};
export type StudentImportPreview = {
    headers: string[];
    requiredHeaders: ReadonlyArray<string>;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    hasErrors: boolean;
    rows: StudentImportPreviewRow[];
};
export type StudentImportSummary = {
    totalRows: number;
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    enrolledCount: number;
};
export type StudentImportResult = {
    summary: StudentImportSummary;
    downloadId: string;
    downloadFileName: string;
};
export type StudentImportOptions = {
    importedById: string;
    courseId?: string;
    enrollToCourse?: boolean;
};
export declare class StudentImportService {
    private readonly prisma;
    private readonly credentialsFiles;
    constructor(prisma: PrismaService);
    preview(buffer: Buffer): Promise<StudentImportPreview>;
    importStudents(buffer: Buffer, options: StudentImportOptions): Promise<StudentImportResult>;
    getCredentialsFile(downloadId: string, currentUserId: string): {
        fileName: string;
        content: Buffer<ArrayBufferLike>;
    };
    private parseAndValidate;
    private toPreview;
    private normalizeHeader;
    private normalizeTextField;
    private detectDelimiter;
    private parseCsvLine;
    private decodeCsvBuffer;
    private buildCredentialsWorkbook;
    private buildWorkbookFileName;
    private storeCredentialsFile;
    private cleanupExpiredFiles;
    private generatePassword;
}
