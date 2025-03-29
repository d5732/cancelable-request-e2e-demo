import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { UnsubscribeOnCloseInterceptor } from './modules/interceptors/unsubscribe-on-close.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true, // enable cors for all origins for this simple POC
  });
  app.useGlobalInterceptors(new UnsubscribeOnCloseInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
