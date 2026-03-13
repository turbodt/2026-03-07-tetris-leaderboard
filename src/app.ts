import * as z from 'zod';
import { Hono } from 'hono';
import { CloudServiceProvider } from './services/cloudProvider.js';
import type { AsyncInitializable, LeaderboardEntry, ServiceContainer } from './models.js';
import { AppError } from './errors.js';
import { ValidationError } from './services/validatorWASM.js';
import { zValidator } from '@hono/zod-validator';
import { serialize } from './serializers.js';

const app = new Hono();
const services: ServiceContainer & AsyncInitializable = new CloudServiceProvider();


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
        const { reader, validator, repository, storage } = services;

        const {replay: replayFile, username} = c.req.valid('form');
        const replayData = new Uint8Array(await replayFile.arrayBuffer());

        if (replayData.length === 0) {
            return c.json({ error: 'Empty replay' }, 400);
        }

        const isValid = validator.validate(replayData);
        if (!isValid) {
            throw new AppError("Invalid replay data");
        }

        const entry: LeaderboardEntry = {
            username,
            timestamp: reader.getTimestamp(replayData),
            seed: reader.getSeed(replayData),
            version: reader.getVersion(replayData),
            score: reader.getScore(replayData),
            filepath: storage.getHashFilepath(replayData),
        };

        await storage.save(entry.filepath, replayData);
        const savedEntry = await repository.save(entry);

        return c.json({
            ...serialize(savedEntry),
            sentAt: new Date().toISOString(),
        }, 200);
});


app.get(
    '/leaderboard',
    async c => {
        const { repository } = services;

        const entries = Array.from(await repository.listTopScores(100));

        return c.json({
            items: serialize(entries),
        }, 200);
});


app.onError((err, c) => {
    if (err instanceof ValidationError) {
        return c.json({ error: err.message }, 400);
    }

    return c.json({ error: err.message }, 500);
});


export default app;
