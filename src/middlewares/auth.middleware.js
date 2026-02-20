import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Account } from "../models/account.model.js";
import { env } from "../config/env.js";

// Verify JWT token - works for both users and chefs
export const verifyJWT = asyncHandler(async (req, _res, next) => {
    try {
        const bearerToken = req
            .header("Authorization")
            ?.trim()
            .replace(/^Bearer\s+/i, "");
        const token = req.cookies?.accessToken || bearerToken;

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, env.ACCESS_TOKEN_SECRET);

        const account = await Account.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!account) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = account;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

// Verify chef role
export const verifyChef = asyncHandler(async (req, _res, next) => {
    if (req.user?.role !== "chef") {
        throw new ApiError(403, "Access denied. Chef privileges required.");
    }
    next();
});

// Verify user role
export const verifyUser = asyncHandler(async (req, _res, next) => {
    if (req.user?.role !== "user") {
        throw new ApiError(403, "Access denied. User privileges required.");
    }
    next();
});

// Verify admin role
export const verifyAdmin = asyncHandler(async (req, _res, next) => {
    if (req.user?.role !== "admin") {
        throw new ApiError(403, "Access denied. Admin privileges required.");
    }
    next();
});
