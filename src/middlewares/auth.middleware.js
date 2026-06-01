import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Account } from "../models/account.model.js";
import { env } from "../config/env.js";

// Verify JWT token - works for both users and chefs
export const verifyJWT = asyncHandler(async (req, _res, next) => {
    const bearerToken = req
        .header("Authorization")
        ?.trim()
        .replace(/^Bearer\s+/i, "");
    const token = req.cookies?.accessToken || bearerToken;

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    // Verify JWT token
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Access token has expired");
        }
        if (error.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid access token");
        }
        throw new ApiError(401, "Token verification failed");
    }

    // Query database for account
    const account = await Account.findById(decodedToken?._id).select(
        "-password -refreshToken"
    );

    if (!account) {
        throw new ApiError(401, "Invalid Access Token - Account not found");
    }

    req.user = account;
    next();
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
