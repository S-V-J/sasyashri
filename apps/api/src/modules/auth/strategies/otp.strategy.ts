import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { AuthService } from '../auth.service';

@Injectable()
export class OtpStrategy extends PassportStrategy(Strategy, 'otp') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(req: Request) {
    const body = req.body as { identifier: string; otp: string };

    if (!body.identifier || !body.otp) {
      throw new UnauthorizedException('Identifier and OTP required');
    }

    const result = await this.authService.loginWithOtp(body);
    return result.user;
  }
}