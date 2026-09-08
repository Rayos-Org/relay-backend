import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: 'Internal server error',
      details: null as any,
    };

    if (exception instanceof HttpException) {
      const responseBody: any = exception.getResponse();
      errorResponse.message = responseBody.message || exception.message;
      errorResponse.details = responseBody.details || null;
    } else if (exception instanceof Error) {
      errorResponse.message = exception.message;
    }

    response.status(status).json(errorResponse);
  }
}
