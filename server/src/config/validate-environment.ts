export function validateEnvironment(
    environment: Record<string, unknown>,
): Record<string, unknown> {
    const databaseUrl = String(environment.DATABASE_URL || '').trim();
    const port = Number(environment.PORT || 3002);
    const trustProxyHops = Number(environment.TRUST_PROXY_HOPS || 0);
    const rateLimitMaxBuckets = Number(
        environment.AUTH_RATE_LIMIT_MAX_BUCKETS || 50_000,
    );
    const rateLimitEnabledValue = String(
        environment.AUTH_RATE_LIMIT_ENABLED ?? 'true',
    ).trim().toLowerCase();
    const booleanValues: Record<string, boolean> = {
        true: true,
        '1': true,
        yes: true,
        on: true,
        false: false,
        '0': false,
        no: false,
        off: false,
    };

    if (!databaseUrl) {
        throw new Error(
            'Не указан DATABASE_URL. Создайте server/.env из .env.example.',
        );
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT должен быть целым числом от 1 до 65535.');
    }

    if (
        !Number.isInteger(trustProxyHops)
        || trustProxyHops < 0
        || trustProxyHops > 10
    ) {
        throw new Error('TRUST_PROXY_HOPS должен быть целым числом от 0 до 10.');
    }

    if (
        !Number.isInteger(rateLimitMaxBuckets)
        || rateLimitMaxBuckets < 1000
        || rateLimitMaxBuckets > 1_000_000
    ) {
        throw new Error(
            'AUTH_RATE_LIMIT_MAX_BUCKETS должен быть целым числом от 1000 до 1000000.',
        );
    }

    if (!(rateLimitEnabledValue in booleanValues)) {
        throw new Error(
            'AUTH_RATE_LIMIT_ENABLED должен быть true или false.',
        );
    }

    return {
        ...environment,
        DATABASE_URL: databaseUrl,
        PORT: port,
        TRUST_PROXY_HOPS: trustProxyHops,
        AUTH_RATE_LIMIT_ENABLED: booleanValues[rateLimitEnabledValue],
        AUTH_RATE_LIMIT_MAX_BUCKETS: rateLimitMaxBuckets,
    };
}
