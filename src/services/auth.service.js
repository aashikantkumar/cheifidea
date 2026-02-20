import crypto from "node:crypto";
import { env } from "../config/env.js";
import { Account } from "../models/account.model.js";
import { ApiError } from "../utils/ApiError.js";

export const hashRefreshToken = (refreshToken) => {
    return crypto
        .createHash("sha256")
        .update(`${env.REFRESH_TOKEN_SECRET}:${refreshToken}`)
        .digest("hex");
};

export const issueAuthTokens = async (accountId, options = {}) => {
    const { session = null } = options;

    const accountQuery = Account.findById(accountId);
    if (session) {
        accountQuery.session(session);
    }

    const account = await accountQuery;
    if (!account) {
        throw new ApiError(404, "Account not found");
    }

    const accessToken = account.generateAccessToken();
    const refreshToken = account.generateRefreshToken();

    account.refreshToken = hashRefreshToken(refreshToken);
    const saveOptions = { validateBeforeSave: false };
    if (session) {
        saveOptions.session = session;
    }

    await account.save(saveOptions);

    return { accessToken, refreshToken };
};

export const isRefreshTokenValid = (account, incomingRefreshToken) => {
    if (!account?.refreshToken || !incomingRefreshToken) {
        return false;
    }

    return account.refreshToken === hashRefreshToken(incomingRefreshToken);
};

export const clearStoredRefreshToken = async (accountId) => {
    await Account.findByIdAndUpdate(accountId, {
        $unset: { refreshToken: 1 },
    });
};
