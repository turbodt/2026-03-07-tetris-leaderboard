import { createMiddleware } from "hono/factory";
import type { ServiceContainer } from "./models.js";
import { CloudServiceProvider } from "./services/cloudProvider.js";
import type { S3Config } from "./services/S3Storage.js";
import { ConfigError } from "./services/errors.js";
import type { PostgresConfig } from "./services/postgresRepository.js";
import { createApp } from "./app.js";


const configMiddleware = createMiddleware<{
    Variables: {
        services: ServiceContainer,
    }
}>(async (c, next) => {

    const storageConfigParams = {
        region: 'S3_REGION',
        endpoint: 'S3_ENDPOINT',
        accessKeyId: 'S3_ACCESS_KEY_ID',
        secretAccessKey: 'S3_SECRET_ACCESS_KEY',
    };
    const storageConfig = Object.entries(storageConfigParams).reduce(
        (acc, [key, paramName]) => {
            return {...acc, [key]: process.env[paramName]};
        },
        {}
    ) as S3Config;

    const storageErrors: string[] = Object.entries(storageConfig)
        .filter(([_, value]) => value === undefined)
        .map(([key,_]) => `${key} not found`);

    const postgresConfig: PostgresConfig = {
        connectionString: (c.env as any).HYPERDRIVE?.connectionString,
    };

    const repoErrors: string[] = []
    if (!postgresConfig.connectionString) {
        repoErrors.push('Postgres connection string not found');
    }

    const errors = [...storageErrors, ...repoErrors];
    if (errors.length > 0) {
        throw new ConfigError(
            `Following errors where found:\n`
            + errors.map(str => `* ${str}`).join('\n')
        );
    }

    const services = new CloudServiceProvider({
        storage: storageConfig,
        repository: postgresConfig,
    });
    await services.initialize();

    c.set('services', services);
    await next();

    c.executionCtx.waitUntil(services.dispose());
});


const app = createApp(configMiddleware);

export default app;



