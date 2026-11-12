import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { Error as MongooseError } from 'mongoose';

interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  requestId?: string;
}

const STATUS_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable_entity',
  429: 'too_many_requests',
  500: 'internal_error',
};

function isDuplicateKeyError(
  exception: unknown,
): exception is { code?: number; keyValue?: Record<string, unknown> } {
  return Boolean(
    exception &&
      typeof exception === 'object' &&
      (exception as { code?: unknown }).code === 11000,
  );
}

/**
 * Single error envelope for every failure: `{ code, message, details?, requestId? }`.
 * Internal exception messages are never forwarded to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: ErrorPayload = {
      code: 'internal_error',
      message: 'Something went wrong on our side.',
      requestId,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        payload = {
          code: STATUS_CODES[status] ?? `http_${status}`,
          message: response,
          requestId,
        };
      } else if (response && typeof response === 'object') {
        const body = response as Record<string, unknown>;
        const rawMessage = body.message;
        const message = Array.isArray(rawMessage)
          ? 'Validation failed.'
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception.message;

        payload = {
          code:
            typeof body.code === 'string'
              ? body.code
              : (STATUS_CODES[status] ?? `http_${status}`),
          message,
          requestId,
        };

        if (body.details && typeof body.details === 'object') {
          payload.details = body.details as Record<string, string[]>;
        }
      }
    } else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      const details: Record<string, string[]> = {};
      for (const [field, error] of Object.entries(exception.errors)) {
        details[field] = [error.message];
      }
      payload = {
        code: 'validation_failed',
        message: 'Validation failed.',
        details,
        requestId,
      };
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      payload = {
        code: 'invalid_identifier',
        message: 'The provided identifier is not valid.',
        requestId,
      };
    } else if (isDuplicateKeyError(exception)) {
      status = HttpStatus.CONFLICT;
      const field = Object.keys(exception.keyValue ?? {})[0];
      payload = {
        code: 'conflict',
        message: field
          ? `That ${field} is already in use.`
          : 'Those details are already in use.',
        details: field ? { [field]: ['Already in use.'] } : undefined,
        requestId,
      };
    }

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }

    httpAdapter.reply(context.getResponse(), payload, status);
  }
}
