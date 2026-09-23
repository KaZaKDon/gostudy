import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http/api-exception.filter';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });
    const config = app.get(ConfigService);
    const express = app.getHttpAdapter().getInstance();

    express.set(
        'trust proxy',
        config.get<number>('TRUST_PROXY_HOPS', 0),
    );
    app.use(helmet());
    app.setGlobalPrefix('api/v1');
    app.enableCors({
        origin: config
            .get<string>('CORS_ORIGINS', '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
        credentials: true,
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Auth-Token',
            'X-Requested-With',
        ],
    });
    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        stopAtFirstError: false,
    }));
    app.useGlobalFilters(new ApiExceptionFilter());
    app.enableShutdownHooks();

    const port = Number(config.get('PORT', 3002));
    await app.listen(port, '0.0.0.0');
}

void bootstrap();
