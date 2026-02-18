import {v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath, options = {}) => {
    try {
        if (!localFilePath) return null;

        // Check if file exists before uploading
        if (!fs.existsSync(localFilePath)) {
            console.error("File does not exist:", localFilePath);
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
        const response = await cloudinary.uploader.upload(localFilePath, defaultOptions);

        // File uploaded successfully
        console.log("File uploaded successfully to cloudinary:", response.url);
        console.log("File size:", Math.round(response.bytes / 1024), "KB");

        // Remove local file after successful upload
        try {
            fs.unlinkSync(localFilePath);
        } catch (unlinkError) {
            console.error("Error deleting local file:", unlinkError.message);
        }

        return response;

    } catch (error) {
        console.error("Cloudinary upload error:", error.message);

        // Try to remove the local file if it exists
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (unlinkError) {
            console.error("Error deleting local file after failed upload:", unlinkError.message);
        }

        return null;
    }
}
export {uploadOnCloudinary};
