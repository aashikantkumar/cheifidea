import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "./env.js";

export const logger = pino({
    level: env.LOG_LEVEL,
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "res.headers['set-cookie']",
        ],
        remove: true,
    },
});

export const requestLogger = pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customProps: (req) => ({ requestId: req.id }),
    customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
});
