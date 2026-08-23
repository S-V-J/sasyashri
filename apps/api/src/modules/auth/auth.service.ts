import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, AuthProvider, KycStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface TokenPayload {
  sub: string;
  email?: string;
  phone?: string;
  roles: UserRole[];
  activeRole: UserRole;
  sessionId: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // REGISTRATION
  // ============================================

  async registerWithCredentials(data: {
    email?: string;
    phone?: string;
    password: string;
    name?: string;
    role?: UserRole;
  }) {
    // Check if user exists
    if (data.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    if (data.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: data.email?.toLowerCase(),
        phone: data.phone,
        passwordHash,
        name: data.name,
        roles: data.role ? [data.role] : [UserRole.BUYER],
        activeRole: data.role || UserRole.BUYER,
        emailVerified: false,
        phoneVerified: false,
      },
    });

    // Create role-specific profile
    await this.createRoleProfile(user.id, data.role || UserRole.BUYER);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User registered: ${user.id} (${user.email || user.phone})`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async registerWithOtp(data: {
    email?: string;
    phone?: string;
    otp: string;
    name?: string;
    role?: UserRole;
  }) {
    // Verify OTP (implement OTP verification logic)
    const isValid = await this.verifyOtp(data.email || data.phone!, data.otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Check if user exists
    if (data.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    if (data.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Create user without password (OTP only)
    const user = await this.prisma.user.create({
      data: {
        email: data.email?.toLowerCase(),
        phone: data.phone,
        name: data.name,
        roles: data.role ? [data.role] : [UserRole.BUYER],
        activeRole: data.role || UserRole.BUYER,
        emailVerified: !!data.email,
        phoneVerified: !!data.phone,
      },
    });

    // Create role-specific profile
    await this.createRoleProfile(user.id, data.role || UserRole.BUYER);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User registered via OTP: ${user.id} (${user.email || user.phone})`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  private async createRoleProfile(userId: string, role: UserRole) {
    switch (role) {
      case UserRole.BUYER:
        await this.prisma.buyerProfile.create({
          data: { userId },
        });
        break;
      case UserRole.SELLER:
        await this.prisma.sellerProfile.create({
          data: { userId, businessName: 'Pending' },
        });
        break;
      case UserRole.FARMER:
        await this.prisma.farmerProfile.create({
          data: { userId, farmerId: `FAR-${uuidv4().slice(0, 8).toUpperCase()}` },
        });
        break;
      case UserRole.FINANCIER:
        await this.prisma.financierProfile.create({
          data: { userId, entityType: 'INDIVIDUAL' },
        });
        break;
      case UserRole.SALES_AGENT:
        await this.prisma.agentProfile.create({
          data: { userId, agentCode: `AGT-${uuidv4().slice(0, 8).toUpperCase()}` },
        });
        break;
      case UserRole.TRANSPORTER:
        await this.prisma.transporterProfile.create({
          data: { userId, transporterCode: `TRN-${uuidv4().slice(0, 8).toUpperCase()}` },
        });
        break;
      case UserRole.QUALITY_LAB:
        await this.prisma.labProfile.create({
          data: { userId, labName: 'Pending', fssaiLicense: 'PENDING' },
        });
        break;
    }
  }

  // ============================================
  // LOGIN
  // ============================================

  async loginWithCredentials(data: {
    identifier: string; // email or phone
    password: string;
    deviceId?: string;
    deviceName?: string;
  }) {
    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: data.identifier.toLowerCase() },
          { phone: data.identifier },
        ],
      },
      include: {
        devices: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.kycStatus === KycStatus.REJECTED) {
      throw new UnauthorizedException('Account suspended. Contact support.');
    }

    // Handle device registration for sellers
    if (data.deviceId && user.roles.includes(UserRole.SELLER)) {
      await this.registerDevice(user.id, data.deviceId, data.deviceName);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.id}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async loginWithOtp(data: {
    identifier: string; // email or phone
    otp: string;
  }) {
    // Verify OTP
    const isValid = await this.verifyOtp(data.identifier, data.otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Find user
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: data.identifier.toLowerCase() },
          { phone: data.identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async loginWithWebAuthn(data: {
    credentialId: string;
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle: string;
  }) {
    // Verify WebAuthn credential
    const credential = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId: data.credentialId },
      include: { user: true },
    });

    if (!credential) {
      throw new UnauthorizedException('Invalid credential');
    }

    // Verify signature (implement WebAuthn verification)
    const isValid = await this.verifyWebAuthnAssertion(credential, data);
    if (!isValid) {
      throw new UnauthorizedException('WebAuthn verification failed');
    }

    // Update counter
    await this.prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: credential.counter + 1,
        lastUsedAt: new Date(),
      },
    });

    const tokens = await this.generateTokens(credential.user);

    return {
      user: this.sanitizeUser(credential.user),
      ...tokens,
    };
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  async generateTokens(user: any): Promise<AuthTokens> {
    const sessionId = uuidv4();
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      activeRole: user.activeRole,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found or password not set');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password changed for user: ${userId}`);
  }

  async resetPassword(emailOrPhone: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }],
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    this.logger.log(`Password reset for user: ${user.id}`);
  }

  // ============================================
  // DEVICE MANAGEMENT (for Sellers)
  // ============================================

  async registerDevice(userId: string, deviceId: string, deviceName?: string) {
    const existing = await this.prisma.device.findUnique({
      where: { deviceId },
    });

    if (existing) {
      if (existing.userId !== userId) {
        throw new ConflictException('Device registered to another user');
      }
      // Update last used
      await this.prisma.device.update({
        where: { id: existing.id },
        data: { lastUsedAt: new Date(), trusted: true },
      });
      return existing;
    }

    return this.prisma.device.create({
      data: {
        userId,
        deviceId,
        name: deviceName,
        trusted: true,
      },
    });
  }

  async getUserDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async revokeDevice(userId: string, deviceId: string) {
    return this.prisma.device.deleteMany({
      where: { userId, deviceId },
    });
  }

  // ============================================
  // ROLE MANAGEMENT
  // ============================================

  async addRole(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.roles.includes(role)) {
      throw new ConflictException('User already has this role');
    }

    // Sellers need special verification
    if (role === UserRole.SELLER) {
      // Check if seller profile exists or create with pending status
      await this.prisma.sellerProfile.upsert({
        where: { userId },
        update: {},
        create: { userId, businessName: 'Pending Verification' },
      });
    } else {
      await this.createRoleProfile(userId, role);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { roles: { push: role } },
    });

    return { success: true };
  }

  async switchRole(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.roles.includes(role)) {
      throw new BadRequestException('User does not have this role');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeRole: role },
    });

    return { success: true };
  }

  // ============================================
  // OTP MANAGEMENT
  // ============================================

  async sendOtp(identifier: string, type: 'email' | 'phone') {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Redis (implement Redis storage)
    // await this.redis.setex(`otp:${identifier}`, 600, otp);

    // Send via email/SMS
    // await this.sendOtpViaChannel(identifier, otp, type);

    this.logger.log(`OTP sent to ${identifier} via ${type}`);
    return { success: true, expiresIn: 600 };
  }

  async verifyOtp(identifier: string, otp: string): Promise<boolean> {
    // Verify OTP from Redis
    // const storedOtp = await this.redis.get(`otp:${identifier}`);
    // return storedOtp === otp;

    // For development, accept any 6-digit OTP
    if (process.env.NODE_ENV === 'development') {
      return otp.length === 6 && /^\d+$/.test(otp);
    }

    return false;
  }

  // ============================================
  // WEB AUTHN
  // ============================================

  async startWebAuthnRegistration(userId: string, deviceName?: string) {
    // Generate registration options
    // Return challenge and options for client
    return {
      challenge: uuidv4(),
      rp: { name: 'Sasyashri', id: this.configService.get('WEB_AUTHN_RP_ID') },
      user: { id: userId, name: userId, displayName: deviceName || 'Sasyashri User' },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      timeout: 60000,
      attestation: 'direct',
    };
  }

  async completeWebAuthnRegistration(userId: string, credential: any) {
    // Verify attestation and store credential
    await this.prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: credential.response.publicKey,
        transports: credential.response.transports || [],
        nickname: credential.nickname,
      },
    });

    return { success: true };
  }

  async startWebAuthnAuthentication(userId: string) {
    // Generate authentication options
    return {
      challenge: uuidv4(),
      timeout: 60000,
      rpId: this.configService.get('WEB_AUTHN_RP_ID'),
      allowCredentials: [],
    };
  }

  private async verifyWebAuthnAssertion(credential: any, assertion: any): Promise<boolean> {
    // Implement WebAuthn assertion verification
    // This requires @simplewebauthn/server
    return true; // Placeholder
  }

  // ============================================
  // UTILITIES
  // ============================================

  sanitizeUser(user: any) {
    const { passwordHash, twoFactorSecret, backupCodes, ...sanitized } = user;
    return sanitized;
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        buyerProfile: true,
        sellerProfile: true,
        farmerProfile: true,
        financierProfile: true,
        agentProfile: true,
        transporterProfile: true,
        labProfile: true,
        adminProfile: true,
      },
    });
  }
}