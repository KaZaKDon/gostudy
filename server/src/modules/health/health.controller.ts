import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    getHealth(): Record<string, unknown> {
        return {
            success: true,
            service: 'gostudy-api',
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
}
