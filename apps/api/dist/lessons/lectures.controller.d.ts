import { AuthUser } from '../common/types/auth-user.type';
import { DeleteLectureFileDto } from './dto/delete-lecture-file.dto';
import { LessonsService } from './lessons.service';
type UploadedLectureFile = {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};
export declare class LecturesController {
    private readonly lessonsService;
    constructor(lessonsService: LessonsService);
    uploadLectureFiles(user: AuthUser, lessonId: string, files: UploadedLectureFile[]): Promise<{
        lessonId: string;
        attachments: string[];
    }>;
    deleteLectureFile(user: AuthUser, lessonId: string, dto: DeleteLectureFileDto): Promise<{
        lessonId: string;
        attachments: string[];
    }>;
}
export {};
