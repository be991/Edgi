import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);  
  const port = process.env.PORT || 3001;
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Edgi API')
    .setDescription('Opportunity Intelligence Platform Core REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`Edgi API server running at: http://localhost:${port}/api/v1`);
  console.log(`OpenAPI Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
