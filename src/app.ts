import * as z from 'zod';
import { Hono, type MiddlewareHandler } from 'hono';
import type { LeaderboardEntry, LeaderboardEntryId, ServiceContainer } from './models.js';
import { AlreadyExistsError, AppError } from './errors.js';
import { ValidationError } from './services/validatorWASM.js';
import { zValidator } from '@hono/zod-validator';
import { serialize } from './serializers.js';
import { cors } from 'hono/cors';



type MyApp =Hono<{
    Variables: {
        services: ServiceContainer;
    };
}>;


export function createApp(middleware: MiddlewareHandler<{
    Variables: {
        services: ServiceContainer,
    }
}>): MyApp {
    const app: MyApp = new Hono();

    app.use(cors({
        origin: '*',
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
        maxAge: 600,
    }));
    app.use(middleware);

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
            const { reader, validator, repository, storage } = c.get('services');

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
            const entryId: LeaderboardEntryId = {...entry};

            const existingEntry = await repository.get(entryId);
            if (existingEntry !== null) {
                throw new AlreadyExistsError(
                    `seed=${entryId.seed} and timestamp=${entryId.timestamp}`
                );
            }

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
            const { repository } = c.get('services');

            const entries = Array.from(await repository.listTopScores(100));

            return c.json({
                items: serialize(entries),
            }, 200);
    });

    app.onError((err, c) => {
        if (err instanceof ValidationError) {
            return c.json({ error: err.message }, 400);
        } else if (err instanceof AlreadyExistsError) {
            return c.json({error: err.message }, 409);
        }

        return c.json({ error: err.message }, 500);
    });

    return app;
}
