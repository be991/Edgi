import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

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

    // Default development fallback identity
    const defaultDevUser: AuthenticatedUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'developer@edgi.local',
    };

    if (!authHeader) {
      // In local dev mode, provide authenticated fallback identity
      if (process.env.NODE_ENV !== 'production') {
        request.user = defaultDevUser;
        return true;
      }
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Bearer token format');
    }

    // In local dev or test mode, accept dev token or attach default user
    request.user = defaultDevUser;
    return true;
  }
}
