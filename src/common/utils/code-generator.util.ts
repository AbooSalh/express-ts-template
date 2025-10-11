import { randomBytes, createHash } from 'crypto';

export class CodeGenerator {
  static generateSecureCode(length: number = 16): string {
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(length);
    let code = '';

    for (let i = 0; i < length; i++) {
      const index = bytes[i] % charset.length;
      code += charset[index];
    }

    return code;
  }

  static hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
