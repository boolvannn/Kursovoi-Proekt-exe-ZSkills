import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { AuthUser } from '../../common/types/auth-user.type';
import { JwtPayload } from '../types/jwt-payload.type';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    constructor(configService: ConfigService);
    validate(payload: JwtPayload): AuthUser;
}
export {};
