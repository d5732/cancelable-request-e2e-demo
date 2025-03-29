import { Module } from '@nestjs/common';
import { UnsubscribeOnCloseInterceptor } from './unsubscribe-on-close.interceptor';

@Module({
  imports: [],
  controllers: [],
  providers: [UnsubscribeOnCloseInterceptor],
})
export class AppModule {}
