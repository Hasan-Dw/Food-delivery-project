import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/**
 * Wraps successful controller results in the envelope the frontend client
 * already understands: `{ data, meta? }`. Controllers return domain objects.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ requestId?: string }>();

    return next.handle().pipe(
      map((data) => {
        if (data === undefined) return data;

        const meta = request.requestId ? { requestId: request.requestId } : undefined;
        return meta ? { data, meta } : { data };
      }),
    );
  }
}
