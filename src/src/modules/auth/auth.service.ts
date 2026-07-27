import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { sub: user.uuid, email: user.email, role: user.role },
      process.env.APP_SECRET || 'dev-secret-change-me',
      { expiresIn: '24h' },
    );

    return { token, user: { uuid: user.uuid, name: user.name, email: user.email, role: user.role } };
  }

  async setup(userData: { name: string; email: string; password: string }) {
    const existing = await this.prisma.user.count();
    if (existing > 0) {
      throw new UnauthorizedException('Setup already completed');
    }

    const hash = await bcrypt.hash(userData.password, 12);
    const user = await this.prisma.user.create({
      data: {
        uuid: crypto.randomUUID(),
        name: userData.name,
        email: userData.email,
        passwordHash: hash,
        role: 'admin',
      },
    });

    const token = jwt.sign(
      { sub: user.uuid, email: user.email, role: user.role },
      process.env.APP_SECRET || 'dev-secret-change-me',
      { expiresIn: '24h' },
    );

    return { token, user: { uuid: user.uuid, name: user.name, email: user.email } };
  }

  async me(userUuid: string) {
    return this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { uuid: true, name: true, email: true, role: true, lastLoginAt: true },
    });
  }
}
