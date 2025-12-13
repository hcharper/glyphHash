import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.CLERK_SECRET_KEY,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    // Clerk JWT payload contains user info
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId: payload.sub },
      include: { tenant: true },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };
  }
}
