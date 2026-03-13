import { serve } from "@hono/node-server";
import app from "./app.js";


serve(app, (info) => {
    console.log(`Listening at http://localhost:${info.port}`);
});
