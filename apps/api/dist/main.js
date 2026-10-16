"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const fs_1 = require("fs");
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const logger = new common_1.Logger('Bootstrap');
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
    app.enableCors({
        origin: process.env.CORS_ORIGIN?.split(',') ?? true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const staticRoot = (0, path_1.join)(process.cwd(), 'static');
    (0, fs_1.mkdirSync)(staticRoot, { recursive: true });
    app.useStaticAssets(staticRoot, {
        prefix: '/static/',
    });
    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port, '0.0.0.0');
    logger.log(`API listening on http://0.0.0.0:${port}`);
}
void bootstrap();
//# sourceMappingURL=main.js.map