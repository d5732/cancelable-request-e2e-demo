import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app/app.module';
import { UnsubscribeOnCloseInterceptor } from './modules/interceptors/unsubscribe-on-close.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true, // enable cors for all origins for this simple POC
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Cancelable Request API')
    .setDescription(
      'API for demonstrating cancelable requests with PostgreSQL. Note: The dog search is currently hardcoded to search for dogs with a name including "peter".',
    )
    .setVersion('1.0')
    .addTag('dogs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  app.useGlobalInterceptors(new UnsubscribeOnCloseInterceptor());

  console.log('Starting server on port', process.env.PORT ?? 3000);
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
