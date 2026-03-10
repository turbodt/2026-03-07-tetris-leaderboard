import * as z from 'zod';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { LocalServiceProvider } from './services/local.js';
import type { AsyncInitializable, ServiceContainer } from './models.js';
import { AppError } from './base.js';
import { ValidationError } from './services/validatorWASM.js';
import { zValidator } from '@hono/zod-validator';
import { serialize } from './serializers.js';

const app = new Hono();
const services: ServiceContainer & AsyncInitializable = new LocalServiceProvider();


services.initialize();


app.post(
    '/',
    zValidator(
        'form',
        z.object({
            replay: z.instanceof(File),
            username: z.string().min(3).max(16),
        })
    ),
    async c => {
        const { validator, repository } = services;

        const {replay: replayFile, username} = c.req.valid('form');
        const replayData = new Uint8Array(await replayFile.arrayBuffer());

        if (replayData.length === 0) {
            return c.json({ error: 'Empty replay' }, 400);
        }

        const isValid = validator.validate(replayData);
        if (!isValid) {
            throw new AppError("Invalid replay data");
        }

        const entry = await repository.save(username, replayData);

        return c.json({
            ...serialize(entry),
            sentAt: new Date().toISOString(),
        }, 200);
});


app.get(
    '/leaderboard',
    async c => {
        const { repository } = services;

        const entries = Array.from(await repository.listTopScores(100));

        return c.json({
            entries: serialize(entries),
            sentAt: new Date().toISOString(),
        }, 200);
});


app.onError((err, c) => {
    if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
    }

    return c.json({ error: err.message }, 500);
});


serve(app, (info) => {
    console.log(`Listening at http://localhost:${info.port}`);
});
