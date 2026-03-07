import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { ReplayValidator } from './validator.js';

const app = new Hono();
const validator = new ReplayValidator();

// Inicialitzem el validador un cop al arrencar el servei
validator.init().then(() => {
    console.log('✅ Validador WASM ready');
});


app.post('/validate', async (c) => {
    try {
        const body = await c.req.arrayBuffer();
        const replayData = new Uint8Array(body);

        if (replayData.length === 0) {
            return c.json({ error: 'Empty replay' }, 400);
        }

        const isValid = validator.validate(replayData);
        const statusCode = isValid ? 400 : 200;

        return c.json({
            valid: isValid,
            timestamp: new Date().toISOString()
        }, statusCode);

    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});


serve(app, (info) => {
    console.log(`Listening at http://localhost:${info.port}`);
});
