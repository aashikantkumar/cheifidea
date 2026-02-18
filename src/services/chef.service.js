import { Account } from "../models/account.model.js";
import { ChefProfile } from "../models/chefProfile.model.js";
import { ApiError } from "../utils/ApiError.js";

// ─── Generate Access & Refresh Tokens ─────────────────────────
export const generateTokens = async (accountId) => {
    try {
        const account = await Account.findById(accountId);
        const accessToken = account.generateAccessToken();
        const refreshToken = account.generateRefreshToken();

        account.refreshToken = refreshToken;
        await account.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

// ─── Find Chef Account with Profile ───────────────────────────
export const findChefWithProfile = async (accountId) => {
    return await Account.findById(accountId)
        .select("-password -refreshToken")
        .populate("chefProfile");
};

// ─── Find Chef Profile by Account ID ──────────────────────────
export const findChefProfile = async (accountId) => {
    const account = await Account.findById(accountId);
    if (!account?.chefProfile) {
        throw new ApiError(404, "Chef profile not found");
    }
    const chefProfile = await ChefProfile.findById(account.chefProfile);
    if (!chefProfile) {
        throw new ApiError(404, "Chef profile not found");
    }
    return { account, chefProfile };
};
