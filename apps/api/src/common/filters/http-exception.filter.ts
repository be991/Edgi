import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An internal server error occurred.';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) || message;
        code = (obj.error as string) || `HTTP_${status}`;
        details = obj.details || (Array.isArray(obj.message) ? obj.message : undefined);
      }
    } else if (exception instanceof Error) {
      message = process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : exception.message;
    }

    response.status(status).json({
      error: {
        code,
        message,
        requestId,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
