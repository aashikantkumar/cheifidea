import { asyncHandler } from "../utils/asyncHandler.js";
import { Account } from "../models/account.model.js";
import { UserProfile } from "../models/userProfile.model.js";
import { Booking } from "../models/booking.model.js";
import { ChefProfile } from "../models/chefProfile.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// ─── Helper: Generate Tokens ───────────────────────────────────
const generateAccessAndRefreshToken = async (accountId) => {
    try {
        const account = await Account.findById(accountId);
        const accessToken = account.generateAccessToken();
        const refreshToken = account.generateRefreshToken();

        account.refreshToken = refreshToken;
        await account.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating tokens"
        );
    }
};

// ─── Register User ─────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password, phone } = req.body;

    // Validate required fields
    if (
        [fullName, email, username, password, phone].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if account already exists
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
        throw new ApiError(409, "User with this email already exists");
    }

    // Check if username taken
    const existingUsername = await UserProfile.findOne({
        username: username.toLowerCase(),
    });
    if (existingUsername) {
        throw new ApiError(409, "Username already taken");
    }

    // Upload avatar if provided
    const avatarLocalPath = req.file?.path;
    let avatar = null;
    if (avatarLocalPath) {
        avatar = await uploadOnCloudinary(avatarLocalPath);
    }

    // Create account
    const account = await Account.create({
        email,
        password,
        role: "user",
    });

    // Create user profile
    const userProfile = await UserProfile.create({
        account: account._id,
        fullName,
        username: username.toLowerCase(),
        phone,
        avatar: avatar?.url || "",
    });

    // Link profile to account
    account.userProfile = userProfile._id;
    await account.save({ validateBeforeSave: false });

    // Generate tokens
    const { accessToken, refreshToken } =
        await generateAccessAndRefreshToken(account._id);

    // Get user without sensitive data
    const createdUser = await Account.findById(account._id)
        .select("-password -refreshToken")
        .populate("userProfile");

    const options = { httpOnly: true, secure: true };

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                { user: createdUser, accessToken, refreshToken },
                "User registered successfully"
            )
        );
});

// ─── Login User ────────────────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const account = await Account.findOne({ email, role: "user" });
    if (!account) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await account.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshToken(account._id);

    const loggedInUser = await Account.findById(account._id)
        .select("-password -refreshToken")
        .populate("userProfile");

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

// ─── Logout User ───────────────────────────────────────────────
const logoutUser = asyncHandler(async (req, res) => {
    await Account.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
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
            process.env.REFRESH_TOKEN_SECRET
        );

        const account = await Account.findById(decodedToken?._id);
        if (!account) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== account?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshToken(account._id);

        const options = { httpOnly: true, secure: true };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
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

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    const account = await Account.findById(req.user._id);
    const isPasswordCorrect = await account.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    account.password = newPassword;
    await account.save({ validateBeforeSave: false });

    return res
        .status(200)
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

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar?.url) {
        throw new ApiError(500, "Error while uploading avatar");
    }

    const account = await Account.findById(req.user._id);
    const updatedProfile = await UserProfile.findByIdAndUpdate(
        account.userProfile,
        { $set: { avatar: avatar.url } },
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

    const { status, page = 1, limit = 10 } = req.query;

    const query = { user: userProfile._id };
    if (status) query.bookingStatus = status;

    const bookings = await Booking.find(query)
        .populate({
            path: "chef",
            select: "fullName avatar phone specialization",
        })
        .populate({
            path: "dishes.dish",
            select: "name images price",
        })
        .sort({ bookingDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                bookings,
                pagination: {
                    total,
                    page: parseInt(page),
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
    if (!chefExists) {
        throw new ApiError(404, "Chef not found");
    }

    const account = await Account.findById(req.user._id);
    const userProfile = await UserProfile.findById(account.userProfile);

    if (userProfile.favoriteChefs.includes(chefId)) {
        throw new ApiError(400, "Chef already in favorites");
    }

    userProfile.favoriteChefs.push(chefId);
    await userProfile.save();

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
