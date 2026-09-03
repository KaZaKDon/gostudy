export function validateEnvironment(
    environment: Record<string, unknown>,
): Record<string, unknown> {
    const databaseUrl = String(environment.DATABASE_URL || '').trim();
    const port = Number(environment.PORT || 3002);

    if (!databaseUrl) {
        throw new Error(
            'Не указан DATABASE_URL. Создайте server/.env из .env.example.',
        );
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT должен быть целым числом от 1 до 65535.');
    }

    return {
        ...environment,
        DATABASE_URL: databaseUrl,
        PORT: port,
    };
}
