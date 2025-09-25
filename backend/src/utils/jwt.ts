import jwt from 'jsonwebtoken';
import { UserRole } from '@/models/User';

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT utilities for token generation and validation
 */
export class JWTUtils {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

  /**
   * Generate access token
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    return jwt.sign(payload, secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: 'es-tm-backend',
      audience: 'es-tm-frontend'
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    return jwt.sign(payload, secret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'es-tm-backend',
      audience: 'es-tm-frontend'
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    return jwt.verify(token, secret, {
      issuer: 'es-tm-backend',
      audience: 'es-tm-frontend'
    }) as JWTPayload;
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    return jwt.verify(token, secret, {
      issuer: 'es-tm-backend',
      audience: 'es-tm-frontend'
    }) as JWTPayload;
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    return Date.now() >= decoded.exp * 1000;
  }
}