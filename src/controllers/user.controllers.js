import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Account } from "../models/account.model.js";
import { UserProfile } from "../models/userProfile.model.js";
import { Booking } from "../models/booking.model.js";
import { ChefProfile } from "../models/chefProfile.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
    clearStoredRefreshToken,
    isRefreshTokenValid,
    issueAuthTokens,
} from "../services/auth.service.js";
import {
    accessTokenCookieOptions,
    clearCookieOptions,
    refreshTokenCookieOptions,
} from "../config/cookie.js";
import { env } from "../config/env.js";
import { getPagination } from "../utils/query.js";
import { withTransaction } from "../utils/transaction.js";

const applySession = (query, session) => {
    if (session) {
        query.session(session);
    }
    return query;
};

// ─── Register User ─────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password, phone } = req.body;

    const avatarLocalPath = req.file?.path;
    let avatar = null;

    if (avatarLocalPath) {
        avatar = await uploadOnCloudinary(avatarLocalPath, {
            folder: "cheifidea/users/avatars",
        });
    }

    const accountId = await withTransaction(async (session) => {
        const existingAccount = await applySession(
            Account.findOne({ email }),
            session
        );
        if (existingAccount) {
            throw new ApiError(409, "User with this email already exists");
        }

        const existingUsername = await applySession(
            UserProfile.findOne({ username: username.toLowerCase() }),
            session
        );
        if (existingUsername) {
            throw new ApiError(409, "Username already taken");
        }

        const account = session
            ? (
                  await Account.create(
                      [
                          {
                              email,
                              password,
                              role: "user",
                          },
                      ],
                      { session }
                  )
              )[0]
            : await Account.create({
                  email,
                  password,
                  role: "user",
              });

        const userProfile = session
            ? (
                  await UserProfile.create(
                      [
                          {
                              account: account._id,
                              fullName,
                              username: username.toLowerCase(),
                              phone,
                              avatar: avatar?.secure_url || "",
                          },
                      ],
                      { session }
                  )
              )[0]
            : await UserProfile.create({
                  account: account._id,
                  fullName,
                  username: username.toLowerCase(),
                  phone,
                  avatar: avatar?.secure_url || "",
              });

        account.userProfile = userProfile._id;
        await account.save({ validateBeforeSave: false, ...(session ? { session } : {}) });

        return account._id;
    });

    const { accessToken, refreshToken } = await issueAuthTokens(accountId);

    const createdUser = await Account.findById(accountId)
        .select("-password -refreshToken")
        .populate("userProfile");

    return res
        .status(201)
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
        .json(
            new ApiResponse(
                201,
                { user: createdUser, accessToken },
                "User registered successfully"
            )
        );
});

// ─── Login User ────────────────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const account = await Account.findOne({ email, role: "user" });
    if (!account) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await account.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await issueAuthTokens(account._id);

    const loggedInUser = await Account.findById(account._id)
        .select("-password -refreshToken")
        .populate("userProfile");

    return res
        .status(200)
        .cookie("accessToken", accessToken, accessTokenCookieOptions)
        .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken },
                "User logged in successfully"
            )
        );
});

// ─── Logout User ───────────────────────────────────────────────
const logoutUser = asyncHandler(async (req, res) => {
    await clearStoredRefreshToken(req.user._id);

    return res
        .status(200)
        .clearCookie("accessToken", clearCookieOptions)
        .clearCookie("refreshToken", clearCookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// ─── Refresh Access Token ──────────────────────────────────────
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            env.REFRESH_TOKEN_SECRET
        );

        const account = await Account.findById(decodedToken?._id);
        if (!account) {
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
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// ─── Change Password ───────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const account = await Account.findById(req.user._id);
    const isPasswordCorrect = await account.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    account.password = newPassword;
    account.refreshToken = undefined;
    await account.save({ validateBeforeSave: false });

    return res
        .status(200)
        .clearCookie("accessToken", clearCookieOptions)
        .clearCookie("refreshToken", clearCookieOptions)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// ─── Get User Profile ──────────────────────────────────────────
const getUserProfile = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id)
        .select("-password -refreshToken")
        .populate("userProfile");

    if (!account) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, account, "User profile fetched successfully")
        );
});

// ─── Update User Profile ───────────────────────────────────────
const updateUserProfile = asyncHandler(async (req, res) => {
    const { fullName, phone, address } = req.body;

    const account = await Account.findById(req.user._id);
    if (!account?.userProfile) {
        throw new ApiError(404, "User profile not found");
    }

    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;

    const updatedProfile = await UserProfile.findByIdAndUpdate(
        account.userProfile,
        { $set: updateFields },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedProfile,
                "Profile updated successfully"
            )
        );
});

// ─── Update Avatar ─────────────────────────────────────────────
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, {
        folder: "cheifidea/users/avatars",
    });
    if (!avatar?.secure_url) {
        throw new ApiError(500, "Error while uploading avatar");
    }

    const account = await Account.findById(req.user._id);
    const updatedProfile = await UserProfile.findByIdAndUpdate(
        account.userProfile,
        { $set: { avatar: avatar.secure_url } },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedProfile, "Avatar updated successfully")
        );
});

// ─── Get User Bookings ─────────────────────────────────────────
const getUserBookings = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id);
    const userProfile = await UserProfile.findById(account.userProfile);

    if (!userProfile) {
        throw new ApiError(404, "User profile not found");
    }

    const { status } = req.query;
    const { page, limit, skip } = getPagination(req.query, {
        defaultPage: 1,
        defaultLimit: 10,
        maxLimit: 100,
    });

    const query = { user: userProfile._id };
    if (status) query.bookingStatus = status;

    const bookings = await Booking.find(query)
        .populate({
            path: "chef",
            select: "fullName avatar phone specialization",
            match: { isApproved: true, accountStatus: "active" },
        })
        .populate({
            path: "dishes.dish",
            select: "name images price",
        })
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Booking.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                bookings,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                },
            },
            "Bookings fetched successfully"
        )
    );
});

// ─── Get Favorite Chefs ────────────────────────────────────────
const getFavoriteChefs = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.user._id);
    const userProfile = await UserProfile.findById(
        account.userProfile
    ).populate({
        path: "favoriteChefs",
        match: { isApproved: true, accountStatus: "active" },
        select: "fullName avatar specialization averageRating totalReviews pricePerHour serviceLocations isAvailable",
    });

    if (!userProfile) {
        throw new ApiError(404, "User profile not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userProfile.favoriteChefs,
                "Favorite chefs fetched"
            )
        );
});

// ─── Add Favorite Chef ─────────────────────────────────────────
const addFavoriteChef = asyncHandler(async (req, res) => {
    const { chefId } = req.params;

    const chefExists = await ChefProfile.findById(chefId);
    if (!chefExists || !chefExists.isApproved || chefExists.accountStatus !== "active") {
        throw new ApiError(404, "Chef not found");
    }

    const account = await Account.findById(req.user._id);

    await UserProfile.findByIdAndUpdate(account.userProfile, {
        $addToSet: { favoriteChefs: chefId },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Chef added to favorites"));
});

// ─── Remove Favorite Chef ──────────────────────────────────────
const removeFavoriteChef = asyncHandler(async (req, res) => {
    const { chefId } = req.params;

    const account = await Account.findById(req.user._id);
    await UserProfile.findByIdAndUpdate(account.userProfile, {
        $pull: { favoriteChefs: chefId },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Chef removed from favorites"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    getUserBookings,
    getFavoriteChefs,
    addFavoriteChef,
    removeFavoriteChef,
};
