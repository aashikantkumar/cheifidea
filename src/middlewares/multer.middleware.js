import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "../config/env.js";

const FIVE_MB = 5 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
]);

const CERTIFICATE_MIME_TYPES = new Set([
    ...IMAGE_MIME_TYPES,
    "application/pdf",
]);

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, env.UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || "").toLowerCase();
        cb(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
});

const createUploader = ({ allowedMimeTypes, maxFiles }) =>
    multer({
        storage,
        limits: {
            fileSize: FIVE_MB,
            files: maxFiles,
        },
        fileFilter: (_req, file, cb) => {
            if (allowedMimeTypes.has(file.mimetype)) {
                cb(null, true);
                return;
            }

            cb(
                new Error(
                    `Invalid file type. Allowed types: ${[...allowedMimeTypes].join(
                        ", "
                    )}`
                ),
                false
            );
        },
    });

export const uploadUserAvatar = createUploader({
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxFiles: 1,
}).single("avatar");

export const uploadChefRegistrationFiles = createUploader({
    allowedMimeTypes: CERTIFICATE_MIME_TYPES,
    maxFiles: 7,
}).fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "certificates", maxCount: 5 },
]);

export const uploadDishImages = createUploader({
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxFiles: 5,
}).array("images", 5);
