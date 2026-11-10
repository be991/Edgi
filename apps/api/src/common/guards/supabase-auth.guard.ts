import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    // Reject all unauthenticated requests without authorization header
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Bearer token format');
    }

    // Local dev testing token
    if (process.env.NODE_ENV !== 'production' && token === 'dev-token') {
      request.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'bethelokafor34562@gmail.com',
      };
      return true;
    }

    // Verify Supabase JWT
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    try {
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as {
          sub: string;
          email?: string;
        };
        request.user = {
          id: decoded.sub,
          email: decoded.email || 'authenticated@edgi.app',
        };
        return true;
      } else {
        // Fallback decode if secret not yet configured
        const decoded = jwt.decode(token) as { sub?: string; email?: string } | null;
        if (!decoded || !decoded.sub) {
          throw new UnauthorizedException('Invalid token payload');
        }
        request.user = {
          id: decoded.sub,
          email: decoded.email || 'authenticated@edgi.app',
        };
        return true;
      }
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired Supabase authentication token');
    }
  }
}
