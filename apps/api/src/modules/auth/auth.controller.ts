import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================
  // REGISTRATION
  // ============================================

  @Post('register/credentials')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register with email/phone and password' })
  async registerWithCredentials(
    @Body() data: {
      email?: string;
      phone?: string;
      password: string;
      name?: string;
      role?: string;
    }
  ) {
    return this.authService.registerWithCredentials(data);
  }

  @Post('register/otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register with OTP verification' })
  async registerWithOtp(
    @Body() data: {
      email?: string;
      phone?: string;
      otp: string;
      name?: string;
      role?: string;
    }
  ) {
    return this.authService.registerWithOtp(data);
  }

  // ============================================
  // LOGIN
  // ============================================

  @Post('login/credentials')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email/phone and password' })
  async loginWithCredentials(
    @Body() data: {
      identifier: string;
      password: string;
      deviceId?: string;
      deviceName?: string;
    },
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.loginWithCredentials(data);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return result;
  }

  @Post('login/otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with OTP' })
  async loginWithOtp(
    @Body() data: { identifier: string; otp: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.loginWithOtp(data);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Post('login/webauthn')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with WebAuthn (Passkey)' })
  async loginWithWebAuthn(
    @Body() data: {
      credentialId: string;
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle: string;
    },
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.loginWithWebAuthn(data);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    res.clearCookie('refreshToken', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @Request() req: any,
    @Body() data: { currentPassword: string; newPassword: string }
  ) {
    await this.authService.changePassword(req.user.sub, data.currentPassword, data.newPassword);
    return { success: true, message: 'Password changed successfully' };
  }

  @Post('password/reset')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password (after OTP verification)' })
  async resetPassword(
    @Body() data: { identifier: string; newPassword: string }
  ) {
    await this.authService.resetPassword(data.identifier, data.newPassword);
    return { success: true, message: 'Password reset successfully' };
  }

  // ============================================
  // OTP MANAGEMENT
  // ============================================

  @Post('otp/send')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send OTP to email or phone' })
  async sendOtp(
    @Body() data: { identifier: string; type: 'email' | 'phone' }
  ) {
    return this.authService.sendOtp(data.identifier, data.type);
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP' })
  async verifyOtp(
    @Body() data: { identifier: string; otp: string }
  ) {
    const isValid = await this.authService.verifyOtp(data.identifier, data.otp);
    return { valid: isValid };
  }

  // ============================================
  // WEB AUTHN (PASSKEYS)
  // ============================================

  @Post('webauthn/register/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start WebAuthn registration' })
  async startWebAuthnRegistration(
    @Request() req: any,
    @Body() data: { deviceName?: string }
  ) {
    return this.authService.startWebAuthnRegistration(req.user.sub, data.deviceName);
  }

  @Post('webauthn/register/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete WebAuthn registration' })
  async completeWebAuthnRegistration(
    @Request() req: any,
    @Body() data: { credential: any }
  ) {
    return this.authService.completeWebAuthnRegistration(req.user.sub, data.credential);
  }

  @Post('webauthn/authenticate/start')
  @ApiOperation({ summary: 'Start WebAuthn authentication' })
  async startWebAuthnAuthentication(
    @Body() data: { userId: string }
  ) {
    return this.authService.startWebAuthnAuthentication(data.userId);
  }

  // ============================================
  // DEVICE MANAGEMENT
  // ============================================

  @Post('devices/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register trusted device (for sellers)' })
  async registerDevice(
    @Request() req: any,
    @Body() data: { deviceId: string; deviceName?: string }
  ) {
    return this.authService.registerDevice(req.user.sub, data.deviceId, data.deviceName);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user devices' })
  async getDevices(@Request() req: any) {
    return this.authService.getUserDevices(req.user.sub);
  }

  @Post('devices/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke device' })
  async revokeDevice(
    @Request() req: any,
    @Body() data: { deviceId: string }
  ) {
    return this.authService.revokeDevice(req.user.sub, data.deviceId);
  }

  // ============================================
  // ROLE MANAGEMENT
  // ============================================

  @Post('roles/add')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add role to user' })
  async addRole(
    @Request() req: any,
    @Body() data: { role: string }
  ) {
    return this.authService.addRole(req.user.sub, data.role as any);
  }

  @Post('roles/switch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch active role' })
  async switchRole(
    @Request() req: any,
    @Body() data: { role: string }
  ) {
    return this.authService.switchRole(req.user.sub, data.role as any);
  }

  // ============================================
  // USER INFO
  // ============================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req: any) {
    const user = await this.authService.getUserById(req.user.sub);
    return this.authService.sanitizeUser(user);
  }
}