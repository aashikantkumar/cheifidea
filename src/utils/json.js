import { ApiError } from "./ApiError.js";

export const parseMaybeJson = (value, fieldName, fallbackValue) => {
    if (value === undefined || value === null || value === "") {
        return fallbackValue;
    }

    if (typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        throw new ApiError(400, `${fieldName} must be valid JSON`);
    }
};

export const ensureArray = (value, fieldName) => {
    if (!Array.isArray(value)) {
        throw new ApiError(400, `${fieldName} must be an array`);
    }
    return value;
};
