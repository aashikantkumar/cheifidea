import { ApiError } from "../utils/ApiError.js";

export const validate = (schema) => (req, _res, next) => {
    const parsed = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
    });

    if (!parsed.success) {
        const message = parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ");

        throw new ApiError(400, message || "Validation failed");
    }

    req.body = parsed.data.body;
    req.params = parsed.data.params;
    req.query = parsed.data.query;

    next();
};
