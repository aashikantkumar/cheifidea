import { Account } from "../models/account.model.js";
import { ChefProfile } from "../models/chefProfile.model.js";
import { ApiError } from "../utils/ApiError.js";
import { issueAuthTokens } from "./auth.service.js";

// ─── Generate Access & Refresh Tokens ─────────────────────────
export const generateTokens = (accountId) => issueAuthTokens(accountId);

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

export const ensureChefIsActive = (chefProfile) => {
    if (!chefProfile.isApproved || chefProfile.accountStatus !== "active") {
        throw new ApiError(
            403,
            "Chef account is not approved for this action. Contact support."
        );
    }
};
