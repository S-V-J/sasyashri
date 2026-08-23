import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromCookie('accessToken'),
        (req) => req?.headers?.['x-access-token'] as string,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: 'sasyashri',
      audience: 'sasyashri-api',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    // Verify user still exists and is active
    const user = await this.authService.getUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has the active role they claim
    if (!user.roles.includes(payload.activeRole)) {
      throw new UnauthorizedException('Invalid role');
    }

    // Attach session info
    return {
      sub: payload.sub,
      email: payload.email,
      phone: payload.phone,
      roles: payload.roles,
      activeRole: payload.activeRole,
      sessionId: payload.sessionId,
    };
  }
}