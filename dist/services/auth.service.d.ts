import { JwtPayload } from 'jsonwebtoken';
import { IUser } from '../models/User';
export interface JWTPayload extends JwtPayload {
    userId: string;
    role: 'admin';
}
export interface LoginResponse {
    user: Pick<IUser, 'id' | 'email' | 'name' | 'role'>;
    accessToken: string;
    expiresIn: number;
}
export declare class AuthService {
    ensureAdmin(): Promise<void>;
    login(email: string, password: string): Promise<LoginResponse>;
    getCurrentUser(userId: string): Promise<Pick<IUser, 'id' | 'email' | 'name' | 'role'>>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map