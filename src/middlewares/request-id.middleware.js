import { randomUUID } from "node:crypto";

export const attachRequestId = (req, res, next) => {
    const requestId = req.header("x-request-id") || randomUUID();
    req.id = requestId;
    res.setHeader("x-request-id", requestId);
    next();
};
