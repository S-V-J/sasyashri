import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { AuthService } from '../auth.service';

@Injectable()
export class WebAuthnStrategy extends PassportStrategy(Strategy, 'webauthn') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(req: Request) {
    const body = req.body as {
      credentialId: string;
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle: string;
    };

    if (!body.credentialId || !body.authenticatorData || !body.clientDataJSON || !body.signature || !body.userHandle) {
      throw new UnauthorizedException('Invalid WebAuthn assertion');
    }

    const result = await this.authService.loginWithWebAuthn(body);
    return result.user;
  }
}