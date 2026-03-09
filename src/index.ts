import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { LocalServiceProvider } from './services/local.js';
import type { AsyncInitializable, ServiceContainer } from './models.js';
import { AppError } from './base.js';
import { ValidationError } from './services/validatorWASM.js';

const app = new Hono();
const services: ServiceContainer & AsyncInitializable = new LocalServiceProvider();


services.initialize();


app.use(async (c, next) => {
    try {
        await next();
    } catch (err: any) {
        if (err instanceof ValidationError) {
            c.res = c.json({ error: err.message }, 400);
        } else {
            c.res = c.json({ error: err.message }, 500);
        }
    }
});


app.post('/validate', async (c) => {
    const { validator } = services;

    const body = await c.req.arrayBuffer();
    const replayData = new Uint8Array(body);

    if (replayData.length === 0) {
        return c.json({ error: 'Empty replay' }, 400);
    }

    const isValid = validator.validate(replayData);
    if (!isValid) {
        throw new AppError("Invalid replay data");
    }

    return c.json({
        timestamp: new Date().toISOString()
    }, 200);
});


app.post('/replay', async c => {
    const { validator, repository } = services;

    const body = await c.req.arrayBuffer();
    const replayData = new Uint8Array(body);

    if (replayData.length === 0) {
        return c.json({ error: 'Empty replay' }, 400);
    }

    const isValid = validator.validate(replayData);
    if (!isValid) {
        throw new AppError("Invalid replay data");
    }

    return c.json({
        timestamp: new Date().toISOString()
    }, 200);

});


serve(app, (info) => {
    console.log(`Listening at http://localhost:${info.port}`);
});
