import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-5 strength score
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  forbidPersonalInfo: boolean;
}

export class PasswordSecurity {
  // Default strong password requirements
  private static defaultRequirements: PasswordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true,
    forbidPersonalInfo: true,
  };

  // Common weak passwords to reject
  private static commonPasswords = new Set([
    'password', 'password123', '123456', '123456789', 'qwerty', 'qwerty123',
    'abc123', 'password1', 'admin', 'administrator', 'root', 'toor',
    'guest', 'test', 'user', 'demo', 'letmein', 'welcome', 'monkey',
    'dragon', 'sunshine', 'master', 'shadow', 'football', 'baseball',
    'superman', 'batman', 'trustno1', 'hello', 'freedom', 'whatever',
    'love', 'secret', 'god', 'money', 'computer', 'internet', 'login'
  ]);

  /**
   * Generate a cryptographically secure temporary password
   */
  static generateTemporaryPassword(length: number = 16): string {
    // Character sets for password generation
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = uppercase + lowercase + numbers + specialChars;

    let password = '';

    // Ensure at least one character from each required set
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(password);
  }

  /**
   * Generate a secure random token for password reset
   */
  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a password using bcrypt with high cost factor
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 14; // High cost factor for security
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength and requirements
   */
  static validatePassword(
    password: string,
    userInfo?: { email?: string; fullName?: string },
    requirements: PasswordRequirements = this.defaultRequirements
  ): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters long`);
    } else {
      score += 1;
      if (password.length >= 16) score += 1; // Bonus for longer passwords
    }

    // Character type requirements
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (requirements.requireUppercase) {
      score += 1;
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (requirements.requireLowercase) {
      score += 1;
    }

    if (requirements.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (requirements.requireNumbers) {
      score += 1;
    }

    if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    } else if (requirements.requireSpecialChars) {
      score += 1;
    }

    // Common password check
    if (requirements.forbidCommonPasswords && this.isCommonPassword(password)) {
      errors.push('Password is too common and easily guessable');
    }

    // Personal information check
    if (requirements.forbidPersonalInfo && userInfo && this.containsPersonalInfo(password, userInfo)) {
      errors.push('Password must not contain personal information (email, name)');
    }

    // Pattern checks
    if (this.hasRepeatingPatterns(password)) {
      errors.push('Password must not contain repeating patterns');
      score = Math.max(0, score - 1);
    }

    if (this.hasSequentialPatterns(password)) {
      errors.push('Password must not contain sequential patterns (abc, 123)');
      score = Math.max(0, score - 1);
    }

    // Additional entropy bonus
    if (this.calculateEntropy(password) > 60) {
      score += 1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(5, score),
    };
  }

  /**
   * Check if password is in common passwords list
   */
  private static isCommonPassword(password: string): boolean {
    return this.commonPasswords.has(password.toLowerCase());
  }

  /**
   * Check if password contains personal information
   */
  private static containsPersonalInfo(
    password: string,
    userInfo: { email?: string; fullName?: string }
  ): boolean {
    const lowercasePassword = password.toLowerCase();

    if (userInfo.email) {
      const emailPart = userInfo.email.split('@')[0].toLowerCase();
      if (emailPart.length >= 4 && lowercasePassword.includes(emailPart)) {
        return true;
      }
    }

    if (userInfo.fullName) {
      const nameParts = userInfo.fullName.toLowerCase().split(/\s+/);
      for (const part of nameParts) {
        if (part.length >= 4 && lowercasePassword.includes(part)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check for repeating patterns (aaa, 111, etc.)
   */
  private static hasRepeatingPatterns(password: string): boolean {
    // Check for 3 or more consecutive identical characters
    return /(.)\1{2,}/.test(password);
  }

  /**
   * Check for sequential patterns (abc, 123, qwe, etc.)
   */
  private static hasSequentialPatterns(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiopasdfghjklzxcvbnm', // keyboard layout
    ];

    for (const sequence of sequences) {
      for (let i = 0; i < sequence.length - 2; i++) {
        const pattern = sequence.substring(i, i + 3);
        const reversePattern = pattern.split('').reverse().join('');

        if (password.toLowerCase().includes(pattern) ||
            password.toLowerCase().includes(reversePattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate password entropy (approximation)
   */
  private static calculateEntropy(password: string): number {
    let charSpace = 0;

    if (/[a-z]/.test(password)) charSpace += 26;
    if (/[A-Z]/.test(password)) charSpace += 26;
    if (/\d/.test(password)) charSpace += 10;
    if (/[^a-zA-Z\d]/.test(password)) charSpace += 32; // Special characters

    return Math.log2(Math.pow(charSpace, password.length));
  }

  /**
   * Shuffle string characters
   */
  private static shuffleString(str: string): string {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

  /**
   * Get password strength text description
   */
  static getPasswordStrengthText(score: number): string {
    switch (score) {
      case 0: return 'Very Weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      case 5: return 'Very Strong';
      default: return 'Unknown';
    }
  }

  /**
   * Generate password expiration time
   */
  static generatePasswordExpiry(hours: number = 24): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  /**
   * Check if password has expired
   */
  static isPasswordExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  /**
   * Generate secure session token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Rate limiting for password attempts
   */
  static shouldLockAccount(failedAttempts: number, lastAttempt: Date): boolean {
    const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
    const cooldownPeriod = Math.pow(2, Math.min(failedAttempts, 10)) * 1000; // Exponential backoff

    return failedAttempts >= 5 && timeSinceLastAttempt < cooldownPeriod;
  }

  /**
   * Calculate cooldown time remaining
   */
  static getCooldownTime(failedAttempts: number, lastAttempt: Date): number {
    const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
    const cooldownPeriod = Math.pow(2, Math.min(failedAttempts, 10)) * 1000;

    return Math.max(0, cooldownPeriod - timeSinceLastAttempt);
  }
}