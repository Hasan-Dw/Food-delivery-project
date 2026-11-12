import {
  BadRequestException,
  Injectable,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

function flatten(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const messages = error.constraints ? Object.values(error.constraints) : [];

    if (messages.length > 0) details[path] = messages;
    if (error.children?.length) Object.assign(details, flatten(error.children, path));
  }

  return details;
}

/**
 * Global DTO validation. Unknown properties are rejected rather than silently
 * stripped, so an attempt to submit `role`, `accountStatus` or an owner id is a
 * visible validation error instead of a quietly ignored field.
 */
@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          code: 'validation_failed',
          message: 'Validation failed.',
          details: flatten(errors),
        }),
    });
  }
}
