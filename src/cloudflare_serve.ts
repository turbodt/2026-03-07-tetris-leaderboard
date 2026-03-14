import { WASI } from '@cloudflare/workers-wasi';
import { createMiddleware } from "hono/factory";
import type { ServiceContainer } from "./models.js";
import { CloudServiceProvider } from "./services/cloudProvider.js";
import type { S3Config } from "./services/S3Storage.js";
import { ConfigError } from "./services/errors.js";
import type { PostgresConfig } from "./services/postgresRepository.js";
import { createApp } from "./app.js";
import { CLOUDFLARE_WASM_ASSETS, SUPPORTED_VERSIONS } from "./wasm-registry.js";
import type { ValidatorWASMConfig } from './services/validatorWASM.js';


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

    const { CLOUDFLARE_WASM_ASSETS } = await import('./wasm-registry');
    const { WASI } = await import('@cloudflare/workers-wasi');
    const validatorConfig: ValidatorWASMConfig = {
        versions: SUPPORTED_VERSIONS,
        loader: async (v) => {
            const module = CLOUDFLARE_WASM_ASSETS[v];
            const wasi = new WASI({ version: 'preview1' });

            const { instance } = await WebAssembly.instantiate(module, {
                wasi_snapshot_preview1: wasi.wasiImport,
            });

            if ((instance.exports as any)._initialize) {
                (instance.exports as any)._initialize();
            } else {
                wasi.initialize(instance);
            }

            return instance;
        }
    };

    const services = new CloudServiceProvider({
        storage: storageConfig,
        repository: postgresConfig,
        validator: validatorConfig,
    });
    await services.initialize();

    c.set('services', services);
    await next();

    c.executionCtx.waitUntil(services.dispose());
});


const app = createApp(configMiddleware);

export default app;



