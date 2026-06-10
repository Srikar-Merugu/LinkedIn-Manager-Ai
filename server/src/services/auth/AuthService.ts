import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export interface TokenPayload {
  userId: string;
  email: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, env.jwtSecret, {
      expiresIn: TOKEN_EXPIRY,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, env.jwtSecret) as TokenPayload;
  }

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  getResetTokenExpiry(): Date {
    return new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  }

  sanitizeUser(user: any) {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.passwordHash;
    delete obj.__v;
    return obj;
  }
}

export const authService = new AuthService();
