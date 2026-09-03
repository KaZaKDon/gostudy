import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ExceptionBody = {
    message?: string | string[];
    status?: string;
    [key: string]: unknown;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ApiExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();
        const isHttpException = exception instanceof HttpException;
        const status = isHttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse = isHttpException
            ? exception.getResponse()
            : null;
        const body = typeof exceptionResponse === 'object'
            ? exceptionResponse as ExceptionBody
            : {};
        const message = Array.isArray(body.message)
            ? body.message.join(' ')
            : body.message
                || (typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : 'Внутренняя ошибка сервера');
        const {
            message: ignoredMessage,
            error: ignoredError,
            statusCode: ignoredStatusCode,
            ...details
        } = body;

        if (!isHttpException) {
            this.logger.error(
                `${request.method} ${request.originalUrl}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        }

        response.status(status).json({
            success: false,
            message,
            ...details,
        });
    }
}
