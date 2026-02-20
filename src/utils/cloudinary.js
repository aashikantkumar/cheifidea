import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath, options = {}) => {
    try {
        if (!localFilePath) return null;

        // Check if file exists before uploading
        if (!fs.existsSync(localFilePath)) {
            logger.warn({ localFilePath }, "cloudinary upload skipped: file not found");
            return null;
        }

        // Default upload options for optimization
        const defaultOptions = {
            resource_type: "auto",
            quality: "auto:good", // Automatic quality optimization
            fetch_format: "auto", // Automatic format selection (WebP for supported browsers)
            ...options
        };

        // Upload file to cloudinary
        const response = await cloudinary.uploader.upload(
            localFilePath,
            defaultOptions
        );

        logger.info(
            {
                cloudinaryUrl: response.secure_url,
                sizeKb: Math.round(response.bytes / 1024),
            },
            "file uploaded to cloudinary"
        );

        // Remove local file after successful upload
        try {
            fs.unlinkSync(localFilePath);
        } catch (unlinkError) {
            logger.warn(
                { err: unlinkError, localFilePath },
                "failed to delete local uploaded file"
            );
        }

        return response;

    } catch (error) {
        logger.error({ err: error }, "cloudinary upload error");

        // Try to remove the local file if it exists
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (unlinkError) {
            logger.warn(
                { err: unlinkError, localFilePath },
                "failed to delete local file after cloudinary error"
            );
        }

        return null;
    }
}
export {uploadOnCloudinary};
