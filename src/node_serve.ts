import 'dotenv/config';
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import type { ServiceContainer } from './models.js';
import { createMiddleware } from 'hono/factory';
import type { S3Config } from './services/S3Storage.js';
import { ConfigError } from './services/errors.js';
import { CloudServiceProvider } from './services/cloudProvider.js';
import type { PostgresConfig } from './services/postgresRepository.js';


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




    const postgresConfigParams = {
        name: 'DATABASE_NAME',
        user: 'DATABASE_USER',
        password: 'DATABASE_PASSWORD',
        port: 'DATABASE_PORT',
        host: 'DATABASE_HOST',
    };
    const postgresParams = Object.entries(postgresConfigParams).reduce(
        (acc, [key, paramName]) => {
            return {...acc, [key]: process.env[paramName]};
        },
        {}
    ) as {
        name: string;
        user: string;
        password: string;
        port: string;
        host: string;
    };

    const repoErrors: string[] = Object.entries(postgresParams)
        .filter(([_, value]) => value === undefined)
        .map(([key,_]) => `${key} not found`);



    const postgresConfig: PostgresConfig = {
        connectionString: `postgresql://`
        + `${postgresParams.user}:${postgresParams.password}`
        + `@${postgresParams.host}:${postgresParams.port}/${postgresParams.name}`
    };

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

    await services.dispose();
});


const app = createApp(configMiddleware);


serve(app, (info) => {
    console.log(`Listening at http://localhost:${info.port}`);
});
