import jwt from "jsonwebtoken";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Account } from "../../models/account.model.js";
import { ChefProfile } from "../../models/chefProfile.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { generateTokens, findChefWithProfile } from "../../services/chef.service.js";
import { clearStoredRefreshToken, isRefreshTokenValid, issueAuthTokens } from "../../services/auth.service.js";
import { env } from "../../config/env.js";
import {
    accessTokenCookieOptions,
    clearCookieOptions,
    refreshTokenCookieOptions,
} from "../../config/cookie.js";

// ─── Register Chef ─────────────────────────────────────────────
export const registerChef = asyncHandler(async (req, res) => {
    const {
        fullName, email, password, phone, bio,
        specialization, experience, pricePerHour, serviceLocations,
    } = req.body;

    // Validate required fields
    if ([fullName, email, password, phone].some((f) => !f || f.trim() === "")) {
        throw new ApiError(400, "All required fields must be provided");
    }
    if (!experience || !pricePerHour) {
        throw new ApiError(400, "Experience and price per hour are required");
    }

    // Check duplicate email
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
        throw new ApiError(409, "Account with this email already exists");
    }

    // Upload avatar (required)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar image is required");
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) throw new ApiError(500, "Failed to upload avatar");

    // Upload cover image (optional)
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    // Upload certificates (optional, max 5)
    const certImages = [];
    if (req.files?.certificates) {
        for (const cert of req.files.certificates) {
            const uploaded = await uploadOnCloudinary(cert.path);
            if (uploaded) certImages.push(uploaded.url);
        }
    }

    // Parse JSON string fields from form-data
    let parsedSpecialization;
    let parsedLocations;
    try {
        parsedSpecialization =
            typeof specialization === "string" ? JSON.parse(specialization) : specialization || [];
        parsedLocations =
            typeof serviceLocations === "string" ? JSON.parse(serviceLocations) : serviceLocations || [];
    } catch {
        throw new ApiError(400, "Invalid JSON for specialization or serviceLocations");
    }

    // Validate serviceLocations
    if (parsedLocations.some((loc) => !loc.city)) {
        throw new ApiError(400, "Each service location must have a 'city' field");
    }

    // Create Account (auth)
    const account = await Account.create({ email, password, role: "chef" });

    // Create ChefProfile (business data) — rollback account if it fails
    try {
        const chefProfile = await ChefProfile.create({
            account: account._id,
            fullName,
            phone,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            bio: bio || "",
            specialization: parsedSpecialization,
            experience: Number(experience),
            pricePerHour: Number(pricePerHour),
            serviceLocations: parsedLocations,
            certification: certImages.map((url) => ({ document: url })),
        });

        // Link profile to account
        account.chefProfile = chefProfile._id;
        await account.save({ validateBeforeSave: false });
    } catch (err) {
        await Account.findByIdAndDelete(account._id); // rollback
        throw new ApiError(500, `Failed to create chef profile: ${err.message}`);
    }

    const { accessToken, refreshToken } = await generateTokens(account._id);
    const createdChef = await findChefWithProfile(account._id);

    return res
        .status(201)
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
        .json(new ApiResponse(201, { user: createdChef, accessToken }, "Chef registered successfully"));
});

// ─── Login Chef ────────────────────────────────────────────────
export const loginChef = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const account = await Account.findOne({ email, role: "chef" });
    if (!account) throw new ApiError(404, "Chef account not found");

    const isPasswordValid = await account.isPasswordCorrect(password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

    const { accessToken, refreshToken } = await generateTokens(account._id);
    const loggedInChef = await findChefWithProfile(account._id);

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
        .json(new ApiResponse(200, { user: loggedInChef, accessToken }, "Chef logged in successfully"));
});

// ─── Logout Chef ───────────────────────────────────────────────
export const logoutChef = asyncHandler(async (req, res) => {
    await clearStoredRefreshToken(req.user._id);

    return res
        .status(200)
        .clearCookie("accessToken", clearCookieOptions)
        .clearCookie("refreshToken", clearCookieOptions)
        .json(new ApiResponse(200, {}, "Chef logged out successfully"));
});

// ─── Refresh Access Token ──────────────────────────────────────
export const refreshChefAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
        incomingRefreshToken,
        env.REFRESH_TOKEN_SECRET
    );

    const account = await Account.findById(decodedToken?._id);
    if (!account || account.role !== "chef") {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (!isRefreshTokenValid(account, incomingRefreshToken)) {
        throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
        await issueAuthTokens(account._id);

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions)
        .json(
            new ApiResponse(
                200,
                { accessToken },
                "Access token refreshed successfully"
            )
        );
});
