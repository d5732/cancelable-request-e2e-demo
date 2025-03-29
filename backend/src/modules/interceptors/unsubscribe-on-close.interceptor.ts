import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, defaultIfEmpty, fromEvent, takeUntil } from 'rxjs';
import { createLogger } from '../../utils';

@Injectable()
export class UnsubscribeOnCloseInterceptor implements NestInterceptor {
  logger = createLogger(this);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<Request>();
    const close = fromEvent(request, 'close');
    this.logger.log('Calling next.handle()');
    return next.handle().pipe(
      takeUntil(close),
      // Prevent 'no elements in sequence' error when request is closed before any value is emitted
      defaultIfEmpty(null),
    );
  }
}
