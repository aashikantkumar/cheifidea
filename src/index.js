import connectDB from "./db/index.js";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

let server;

const shutdown = async (signal) => {
    try {
        logger.info({ signal }, "shutdown signal received");

        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
        }

        process.exit(0);
    } catch (error) {
        logger.error({ err: error }, "graceful shutdown failed");
        process.exit(1);
    }
};

const bootstrap = async () => {
    await connectDB();

    server = app.listen(env.PORT, () => {
        logger.info({ port: env.PORT }, "server started");
    });

    server.on("error", (error) => {
        logger.error({ err: error }, "server error");
        throw error;
    });
};

process.on("SIGINT", () => {
    shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    shutdown("SIGTERM");
});

process.on("unhandledRejection", (error) => {
    logger.error({ err: error }, "unhandled rejection");
});

process.on("uncaughtException", (error) => {
    logger.error({ err: error }, "uncaught exception");
    shutdown("uncaughtException");
});

bootstrap().catch((error) => {
    logger.error({ err: error }, "application bootstrap failed");
    process.exit(1);
});
