import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';

interface RequestWithRefreshToken extends Request {
  body: {
    refreshToken: string;
  };
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtRefreshSecret = configService.get<string>('jwt.refreshSecret');

    if (!jwtRefreshSecret) {
      throw new Error('JWT refresh secret is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: jwtRefreshSecret,
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  async validate(req: RequestWithRefreshToken, payload: JwtPayload) {
    const refreshToken = req.body.refreshToken;

    const tokenExists = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenExists || tokenExists.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return { ...user, refreshToken };
  }
}
