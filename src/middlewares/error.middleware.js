import fs from "node:fs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";

const buildErrorResponse = (error) => ({
    statusCode: error.statusCode,
    data: null,
    message: error.message,
    success: false,
    errors: error.errors || [],
});

const collectUploadedFilePaths = (req) => {
    const filePaths = [];

    if (req.file?.path) {
        filePaths.push(req.file.path);
    }

    if (Array.isArray(req.files)) {
        for (const file of req.files) {
            if (file?.path) filePaths.push(file.path);
        }
    }

    if (req.files && typeof req.files === "object" && !Array.isArray(req.files)) {
        for (const value of Object.values(req.files)) {
            if (!Array.isArray(value)) continue;
            for (const file of value) {
                if (file?.path) filePaths.push(file.path);
            }
        }
    }

    return [...new Set(filePaths)];
};

const cleanupUploadedFiles = (req) => {
    for (const filePath of collectUploadedFilePaths(req)) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            logger.warn({ err: error, filePath }, "failed to cleanup uploaded file");
        }
    }
};

const mapMongooseError = (error) => {
    if (error instanceof mongoose.Error.CastError) {
        return new ApiError(400, `Invalid ${error.path}: ${error.value}`);
    }

    if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map((item) => item.message);
        return new ApiError(400, "Validation failed", messages);
    }

    if (error?.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {})[0] || "field";
        return new ApiError(409, `${duplicateField} already exists`);
    }

    return null;
};

export const multerErrorHandler = (err, _req, _res, next) => {
    if (err?.name === "MulterError") {
        if (err.code === "LIMIT_FILE_SIZE") {
            return next(
                new ApiError(
                    400,
                    "File size too large. Maximum allowed size is 5 MB per file."
                )
            );
        }

        if (err.code === "LIMIT_FILE_COUNT") {
            return next(
                new ApiError(400, "Too many files. Maximum files limit exceeded.")
            );
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return next(new ApiError(400, "Unexpected field in file upload."));
        }
    }

    if (typeof err?.message === "string" && err.message.includes("Invalid file type")) {
        return next(new ApiError(400, err.message));
    }

    return next(err);
};

export const notFoundHandler = (req, _res, next) => {
    next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, _next) => {
    cleanupUploadedFiles(req);

    const mappedMongooseError = mapMongooseError(err);
    const resolvedError =
        mappedMongooseError ||
        (err instanceof ApiError
            ? err
            : new ApiError(
                  500,
                  env.IS_PRODUCTION
                      ? "Internal Server Error"
                      : err?.message || "Internal Server Error"
              ));

    logger.error(
        {
            err,
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            statusCode: resolvedError.statusCode,
        },
        "request failed"
    );

    return res.status(resolvedError.statusCode).json(buildErrorResponse(resolvedError));
};
