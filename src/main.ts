import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefixes and filters
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Rayos Relay API')
    .setDescription('The Rayos Relay backend for gasless transactions and social recovery.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger docs at: http://localhost:${port}/api/docs`);
}
bootstrap();
