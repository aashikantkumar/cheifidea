import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { requestLogger } from "./config/logger.js";
import { isDbReady } from "./db/index.js";
import { ApiError } from "./utils/ApiError.js";
import { attachRequestId } from "./middlewares/request-id.middleware.js";
import {
    errorHandler,
    multerErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware.js";

const app = express();

if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(attachRequestId);
app.use(requestLogger);
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    })
);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || env.CORS_ALLOWLIST.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new ApiError(403, "CORS origin not allowed"));
        },
        credentials: true,
        optionsSuccessStatus: 204,
    })
);

app.use(
    rateLimit({
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            statusCode: 429,
            message: "Too many requests. Please try again later.",
            success: false,
        },
    })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";
import chefRouter from "./routes/chef.routes.js";
import publicRouter from "./routes/public.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import adminRouter from "./modules/admin/admin.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/chefs", chefRouter);
app.use("/api/v1/public", publicRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/admin", adminRouter);

app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
});

app.get("/api/v1/health/live", (_req, res) => {
    res.status(200).json({ status: "ok", message: "Service is alive" });
});

app.get("/api/v1/health/ready", (_req, res) => {
    if (isDbReady()) {
        res.status(200).json({ status: "ok", message: "Service is ready" });
        return;
    }

    res.status(503).json({
        status: "degraded",
        message: "Database connection is not ready",
    });
});

app.use(notFoundHandler);
app.use(multerErrorHandler);
app.use(errorHandler);

export { app };
