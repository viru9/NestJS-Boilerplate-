import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomEmail } from '../utils/test-utils';

export interface UserFactoryOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
  emailVerified?: boolean;
}

export class UserFactory {
  static async create(options: UserFactoryOptions = {}) {
    const password = options.password || 'Test123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    return {
      email: options.email || randomEmail(),
      password: hashedPassword,
      firstName: options.firstName || 'Test',
      lastName: options.lastName || 'User',
      role: options.role || Role.USER,
      isActive: options.isActive !== undefined ? options.isActive : true,
      emailVerified:
        options.emailVerified !== undefined ? options.emailVerified : false,
    };
  }

  static async createAdmin(options: UserFactoryOptions = {}) {
    return this.create({ ...options, role: Role.ADMIN });
  }

  static async createPremium(options: UserFactoryOptions = {}) {
    return this.create({ ...options, role: Role.PREMIUM });
  }

  static createLoginDto(email?: string, password?: string) {
    return {
      email: email || randomEmail(),
      password: password || 'Test123!',
    };
  }

  static createRegisterDto(overrides: Partial<UserFactoryOptions> = {}) {
    return {
      email: overrides.email || randomEmail(),
      password: overrides.password || 'Test123!',
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
    };
  }
}
