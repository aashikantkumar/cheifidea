import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// CORS - Allow both User Website and Chef Website
app.use(
    cors({
        origin: [
            process.env.USER_WEBSITE_URL,
            process.env.CHEF_WEBSITE_URL,
            process.env.CORS_ORIGIN,
        ].filter(Boolean),
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ─── Import Routes ─────────────────────────────────────────────
import userRouter from "./routes/user.routes.js";
import chefRouter from "./routes/chef.routes.js";
import publicRouter from "./routes/public.routes.js";
import bookingRouter from "./routes/booking.routes.js";

// ─── Route Declarations ────────────────────────────────────────
// User Website APIs
app.use("/api/v1/users", userRouter);

// Chef Website APIs
app.use("/api/v1/chefs", chefRouter);

// Public APIs (No auth - used by User Website to browse)
app.use("/api/v1/public", publicRouter);

// Booking APIs (Shared - requires auth)
app.use("/api/v1/bookings", bookingRouter);

// Health check
app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
});

export { app };